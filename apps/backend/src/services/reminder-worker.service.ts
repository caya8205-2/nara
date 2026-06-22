import type { FastifyBaseLogger } from 'fastify'
import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq'
import { env } from '../config/env.js'
import { reminderService } from './reminder.service.js'

const queueName = 'nara-reminder-delivery'
const tickJobName = 'process-due-reminders'

export type ReminderWorkerRuntimeStatus = {
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

export class ReminderWorkerService {
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
    if (!env.REMINDER_WORKER_ENABLED) {
      this.lastError = 'REMINDER_WORKER_ENABLED=false'
      logger.info('reminder worker disabled')
      return
    }

    if (this.started) return
    if (!env.REDIS_URL) {
      this.lastError = 'REDIS_URL is not configured'
      logger.warn('reminder worker disabled because REDIS_URL is not configured')
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
            const result = await reminderService.processDue()
            this.lastRunAt = new Date().toISOString()
            this.lastRunStatus = 'ok'
            this.lastError = null
            if (result.processed > 0) {
              logger.info({ processed: result.processed }, 'processed due reminders')
            }
            return result
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
      logger.error({ err: error }, 'failed to start reminder worker')
      void this.stop()
      return
    }

    this.worker.on('failed', (job, error) => {
      this.lastRunAt = new Date().toISOString()
      this.lastRunStatus = 'error'
      this.lastError = errorMessage(error)
      logger.error({ jobId: job?.id, err: error }, 'reminder delivery job failed')
    })

    this.worker.on('error', (error) => {
      this.lastError = errorMessage(error)
      logger.error({ err: error }, 'reminder worker runtime error')
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

  getStatus(): ReminderWorkerRuntimeStatus {
    const enabled = env.REMINDER_WORKER_ENABLED
    const configured = Boolean(env.REDIS_URL)
    const base = {
      queueName,
      jobName: tickJobName,
      enabled,
      configured,
      started: this.started,
      intervalMs: env.REMINDER_WORKER_INTERVAL_MS,
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
        message: 'REMINDER_WORKER_ENABLED=false, due reminders will not be processed automatically.',
      }
    }

    if (!configured) {
      return {
        ...base,
        ok: false,
        status: 'missing',
        message: 'REDIS_URL is not configured, so the BullMQ reminder worker cannot start.',
      }
    }

    if (!this.started) {
      return {
        ...base,
        ok: false,
        status: 'error',
        message: this.lastError
          ? `Reminder worker is not running: ${this.lastError}`
          : 'Reminder worker is enabled but has not started.',
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
      message: `Reminder worker is running every ${env.REMINDER_WORKER_INTERVAL_MS}ms.`,
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
          repeat: { every: env.REMINDER_WORKER_INTERVAL_MS },
          removeOnComplete: 25,
          removeOnFail: 50,
        },
      )
      await this.queue.add(
        tickJobName,
        { immediate: true },
        {
          jobId: `${tickJobName}-startup`,
          removeOnComplete: 10,
          removeOnFail: 25,
        },
      )
      logger.info({
        queue: queueName,
        intervalMs: env.REMINDER_WORKER_INTERVAL_MS,
      }, 'reminder worker started')
      this.scheduledAt = new Date().toISOString()
      this.lastError = null
    } catch (error) {
      this.lastError = errorMessage(error)
      logger.error({ err: error }, 'failed to schedule reminder worker')
      try {
        await this.stop()
      } catch (stopError) {
        logger.error({ err: stopError }, 'failed to stop reminder worker after schedule failure')
      }
    }
  }
}

export const reminderWorkerService = new ReminderWorkerService()

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
