import type { FastifyBaseLogger } from 'fastify'
import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq'
import { env } from '../config/env.js'
import { backupService } from './backup.service.js'

const queueName = 'nara-backup'
const tickJobName = 'run-scheduled-backup'

export type BackupWorkerRuntimeStatus = {
  ok: boolean
  status: 'ok' | 'disabled' | 'missing' | 'error'
  message?: string
  queueName: string
  jobName: string
  enabled: boolean
  configured: boolean
  started: boolean
  intervalMs: number
  startedAt: string | null
  scheduledAt: string | null
  lastRunAt: string | null
  lastRunStatus: 'ok' | 'error' | null
  lastError: string | null
}

export class BackupWorkerService {
  private connection: ConnectionOptions | null = null
  private queue: Queue | null = null
  private worker: Worker | null = null
  private started = false
  private startedAt: string | null = null
  private scheduledAt: string | null = null
  private lastRunAt: string | null = null
  private lastRunStatus: 'ok' | 'error' | null = null
  private lastError: string | null = null

  start(logger: FastifyBaseLogger) {
    if (!env.BACKUP_WORKER_ENABLED) {
      this.lastError = 'BACKUP_WORKER_ENABLED=false'
      logger.info('backup worker disabled')
      return
    }

    if (this.started) return
    if (!env.REDIS_URL) {
      this.lastError = 'REDIS_URL is not configured'
      logger.warn('backup worker disabled because REDIS_URL is not configured')
      return
    }

    try {
      this.connection = {
        ...RedisUrlParts.from(env.REDIS_URL),
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      }
      this.queue = new Queue(queueName, { connection: this.connection })
      this.worker = new Worker(
        queueName,
        async (job: Job) => {
          if (job.name !== tickJobName) return { skipped: true }

          try {
            const record = await backupService.createBackup('full')
            this.lastRunAt = new Date().toISOString()

            if (record.status === 'failed') {
              this.lastRunStatus = 'error'
              this.lastError = record.error ?? 'Scheduled backup failed'
              throw new Error(this.lastError)
            }

            this.lastRunStatus = 'ok'
            this.lastError = null
            logger.info({ backupId: record.id, location: record.location }, 'scheduled backup completed')
            return record
          } catch (error) {
            this.lastRunAt = new Date().toISOString()
            this.lastRunStatus = 'error'
            this.lastError = errorMessage(error)
            throw error
          }
        },
        {
          connection: this.connection,
          concurrency: 1,
        },
      )
    } catch (error) {
      this.lastError = errorMessage(error)
      logger.error({ err: error }, 'failed to start backup worker')
      void this.stop()
      return
    }

    this.worker.on('failed', (job, error) => {
      this.lastRunAt = new Date().toISOString()
      this.lastRunStatus = 'error'
      this.lastError = errorMessage(error)
      logger.error({ jobId: job?.id, err: error }, 'scheduled backup job failed')
    })

    this.worker.on('error', (error) => {
      this.lastError = errorMessage(error)
      logger.error({ err: error }, 'backup worker runtime error')
    })

    this.started = true
    this.startedAt = new Date().toISOString()
    this.lastError = null

    void this.schedule(logger)
  }

  async stop() {
    const worker = this.worker
    const queue = this.queue
    this.worker = null
    this.queue = null
    this.connection = null
    this.started = false
    this.startedAt = null

    await worker?.close()
    await queue?.close()
  }

  getStatus(): BackupWorkerRuntimeStatus {
    const enabled = env.BACKUP_WORKER_ENABLED
    const configured = Boolean(env.REDIS_URL)
    const base = {
      queueName,
      jobName: tickJobName,
      enabled,
      configured,
      started: this.started,
      intervalMs: env.BACKUP_WORKER_INTERVAL_MS,
      startedAt: this.startedAt,
      scheduledAt: this.scheduledAt,
      lastRunAt: this.lastRunAt,
      lastRunStatus: this.lastRunStatus,
      lastError: this.lastError,
    }

    if (!enabled) {
      return {
        ...base,
        ok: false,
        status: 'disabled',
        message: 'BACKUP_WORKER_ENABLED=false, scheduled backups will not run automatically.',
      }
    }

    if (!configured) {
      return {
        ...base,
        ok: false,
        status: 'missing',
        message: 'REDIS_URL is not configured, so the BullMQ backup worker cannot start.',
      }
    }

    if (!this.started) {
      return {
        ...base,
        ok: false,
        status: 'error',
        message: this.lastError
          ? `Backup worker is not running: ${this.lastError}`
          : 'Backup worker is enabled but has not started.',
      }
    }

    if (this.lastError) {
      return {
        ...base,
        ok: false,
        status: 'error',
        message: this.lastError,
      }
    }

    return {
      ...base,
      ok: true,
      status: 'ok',
      message: `Backup worker is running every ${env.BACKUP_WORKER_INTERVAL_MS}ms.`,
    }
  }

  private async schedule(logger: FastifyBaseLogger) {
    if (!this.queue) return

    try {
      await this.queue.add(
        tickJobName,
        {},
        {
          jobId: `${tickJobName}-repeat`,
          repeat: { every: env.BACKUP_WORKER_INTERVAL_MS },
          removeOnComplete: 25,
          removeOnFail: 50,
        },
      )
      logger.info({
        queue: queueName,
        intervalMs: env.BACKUP_WORKER_INTERVAL_MS,
      }, 'backup worker started')
      this.scheduledAt = new Date().toISOString()
      this.lastError = null
    } catch (error) {
      this.lastError = errorMessage(error)
      logger.error({ err: error }, 'failed to schedule backup worker')
      try {
        await this.stop()
      } catch (stopError) {
        logger.error({ err: stopError }, 'failed to stop backup worker after schedule failure')
      }
    }
  }
}

export const backupWorkerService = new BackupWorkerService()

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

class RedisUrlParts {
  static from(rawUrl: string) {
    const url = new URL(rawUrl)
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 6379,
      username: decodeURIComponent(url.username || ''),
      password: url.password ? decodeURIComponent(url.password) : undefined,
      db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    }
  }
}
