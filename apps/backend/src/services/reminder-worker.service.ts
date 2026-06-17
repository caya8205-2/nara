import type { FastifyBaseLogger } from 'fastify'
import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq'
import { env } from '../config/env.js'
import { reminderService } from './reminder.service.js'

const queueName = 'nara-reminder-delivery'
const tickJobName = 'process-due-reminders'

export class ReminderWorkerService {
  private connection: ConnectionOptions | null = null
  private queue: Queue | null = null
  private worker: Worker | null = null
  private started = false

  start(logger: FastifyBaseLogger) {
    if (!env.REMINDER_WORKER_ENABLED) {
      logger.info('reminder worker disabled')
      return
    }

    if (this.started) return
    if (!env.REDIS_URL) {
      logger.warn('reminder worker disabled because REDIS_URL is not configured')
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
        const result = await reminderService.processDue()
        if (result.processed > 0) {
          logger.info({ processed: result.processed }, 'processed due reminders')
        }
        return result
      },
      {
        connection: this.connection,
        concurrency: 1,
      },
    )

    this.worker.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, err: error }, 'reminder delivery job failed')
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
    } catch (error) {
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
