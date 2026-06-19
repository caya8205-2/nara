import type { FastifyBaseLogger } from 'fastify'
import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq'
import { env } from '../config/env.js'
import { reportService } from './report.service.js'

const queueName = 'nara-report-generation'
const tickJobName = 'process-due-report-schedules'

export class ReportWorkerService {
  private connection: ConnectionOptions | null = null
  private queue: Queue | null = null
  private worker: Worker | null = null
  private started = false

  start(logger: FastifyBaseLogger) {
    if (!env.REPORT_WORKER_ENABLED) {
      logger.info('report worker disabled')
      return
    }

    if (this.started) return
    if (!env.REDIS_URL) {
      logger.warn('report worker disabled because REDIS_URL is not configured')
      return
    }

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
        const result = await reportService.processDue()
        if (result.processed > 0) {
          logger.info({ processed: result.processed }, 'processed due report schedules')
        }
        return result
      },
      {
        connection: this.connection,
        concurrency: 1,
      },
    )

    this.worker.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, err: error }, 'report generation job failed')
    })

    this.started = true

    void this.schedule(logger)
  }

  async stop() {
    const worker = this.worker
    const queue = this.queue
    this.worker = null
    this.queue = null
    this.connection = null
    this.started = false

    await worker?.close()
    await queue?.close()
  }

  private async schedule(logger: FastifyBaseLogger) {
    if (!this.queue) return

    try {
      await this.queue.add(
        tickJobName,
        {},
        {
          jobId: `${tickJobName}-repeat`,
          repeat: { every: env.REPORT_WORKER_INTERVAL_MS },
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
        intervalMs: env.REPORT_WORKER_INTERVAL_MS,
      }, 'report worker started')
    } catch (error) {
      logger.error({ err: error }, 'failed to schedule report worker')
      try {
        await this.stop()
      } catch (stopError) {
        logger.error({ err: stopError }, 'failed to stop report worker after schedule failure')
      }
    }
  }
}

export const reportWorkerService = new ReportWorkerService()

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
