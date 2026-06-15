import type { FastifyBaseLogger } from 'fastify'
import { env } from '../config/env.js'
import { reminderService } from './reminder.service.js'

export class ReminderWorkerService {
  private timer: NodeJS.Timeout | null = null
  private running = false

  start(logger: FastifyBaseLogger) {
    if (!env.REMINDER_WORKER_ENABLED) {
      logger.info('reminder worker disabled')
      return
    }

    if (this.timer) return

    const tick = async () => {
      if (this.running) return
      this.running = true
      try {
        const result = await reminderService.processDue()
        if (result.processed > 0) {
          logger.info({ processed: result.processed }, 'processed due reminders')
        }
      } catch (error) {
        logger.error({ err: error }, 'failed to process due reminders')
      } finally {
        this.running = false
      }
    }

    this.timer = setInterval(tick, env.REMINDER_WORKER_INTERVAL_MS)
    this.timer.unref()
    void tick()
    logger.info({
      intervalMs: env.REMINDER_WORKER_INTERVAL_MS,
    }, 'reminder worker started')
  }

  stop() {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  }
}

export const reminderWorkerService = new ReminderWorkerService()
