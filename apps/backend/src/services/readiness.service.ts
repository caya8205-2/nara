import { sql } from 'drizzle-orm'
import Redis from 'ioredis'
import { env } from '../config/env.js'
import { db } from '../db/index.js'
import { backupService } from './backup.service.js'
import { backupWorkerService } from './backup-worker.service.js'
import { groupSummaryWorkerService } from './group-summary-worker.service.js'
import { openClawService } from './openclaw.service.js'
import { reminderWorkerService } from './reminder-worker.service.js'

export type DependencyStatus = {
  ok: boolean
  status: 'ok' | 'missing' | 'error' | 'disabled'
  message?: string
  details?: Record<string, unknown>
}

export type ReadinessReport = {
  ok: boolean
  service: 'nara-backend'
  timestamp: string
  dependencies: {
    database: DependencyStatus
    redis: DependencyStatus
    backup: DependencyStatus
    backupWorker: DependencyStatus
    groupSummaryWorker: DependencyStatus
    reminderWorker: DependencyStatus
    openclaw: DependencyStatus
    whatsapp: DependencyStatus
  }
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const gatewayHealthUrl = (rawUrl?: string) => {
  if (!rawUrl) return null
  const url = new URL(rawUrl)
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
  url.pathname = '/health'
  url.search = ''
  url.hash = ''
  return url.toString()
}

export class ReadinessService {
  async checkDatabase(): Promise<DependencyStatus> {
    try {
      await db.execute(sql`select 1`)
      return { ok: true, status: 'ok' }
    } catch (error) {
      return { ok: false, status: 'error', message: errorMessage(error) }
    }
  }

  async checkRedis(): Promise<DependencyStatus> {
    if (!env.REDIS_URL) {
      return { ok: false, status: 'missing', message: 'REDIS_URL is not configured' }
    }

    const redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 1500,
      maxRetriesPerRequest: 0,
      retryStrategy: null,
    })

    try {
      await redis.connect()
      await redis.ping()
      return { ok: true, status: 'ok' }
    } catch (error) {
      return { ok: false, status: 'error', message: errorMessage(error) }
    } finally {
      redis.disconnect()
    }
  }

  async checkOpenClaw(): Promise<DependencyStatus> {
    const healthUrl = gatewayHealthUrl(env.OPENCLAW_GATEWAY_URL)

    if (!healthUrl) {
      return {
        ok: false,
        status: 'missing',
        message: 'OPENCLAW_GATEWAY_URL is not configured',
      }
    }

    try {
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(1500),
        headers: env.OPENCLAW_GATEWAY_TOKEN
          ? { Authorization: `Bearer ${env.OPENCLAW_GATEWAY_TOKEN}` }
          : undefined,
      })

      if (!response.ok) {
        return { ok: false, status: 'error', message: `HTTP ${response.status}` }
      }

      return { ok: true, status: 'ok' }
    } catch (error) {
      return { ok: false, status: 'error', message: errorMessage(error) }
    }
  }

  checkReminderWorker(): DependencyStatus {
    const status = reminderWorkerService.getStatus()
    return {
      ok: status.ok,
      status: status.status,
      message: status.message,
      details: {
        enabled: status.enabled,
        configured: status.configured,
        started: status.started,
        queueName: status.queueName,
        jobName: status.jobName,
        intervalMs: status.intervalMs,
        startedAt: status.startedAt,
        scheduledAt: status.scheduledAt,
        lastRunAt: status.lastRunAt,
        lastRunStatus: status.lastRunStatus,
        lastError: status.lastError,
      },
    }
  }

  async checkBackup(): Promise<DependencyStatus> {
    const status = await backupService.getStatus()
    return {
      ok: status.ok,
      status: status.status,
      message: status.message,
      details: status.details,
    }
  }

  checkBackupWorker(): DependencyStatus {
    const status = backupWorkerService.getStatus()
    return {
      ok: status.ok,
      status: status.status,
      message: status.message,
      details: {
        enabled: status.enabled,
        configured: status.configured,
        started: status.started,
        queueName: status.queueName,
        jobName: status.jobName,
        intervalMs: status.intervalMs,
        startedAt: status.startedAt,
        scheduledAt: status.scheduledAt,
        lastRunAt: status.lastRunAt,
        lastRunStatus: status.lastRunStatus,
        lastError: status.lastError,
      },
    }
  }

  checkGroupSummaryWorker(): DependencyStatus {
    const status = groupSummaryWorkerService.getStatus()
    return {
      ok: status.ok,
      status: status.status,
      message: status.message,
      details: {
        enabled: status.enabled,
        configured: status.configured,
        started: status.started,
        queueName: status.queueName,
        jobName: status.jobName,
        intervalMs: status.intervalMs,
        startedAt: status.startedAt,
        scheduledAt: status.scheduledAt,
        lastRunAt: status.lastRunAt,
        lastRunStatus: status.lastRunStatus,
        lastError: status.lastError,
      },
    }
  }

  async getReport(): Promise<ReadinessReport> {
    const [database, redis, backup, openclaw, whatsapp] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkBackup(),
      this.checkOpenClaw(),
      openClawService.getWhatsAppReadiness(),
    ])
    const backupWorker = this.checkBackupWorker()
    const reminderWorker = this.checkReminderWorker()
    const groupSummaryWorker = this.checkGroupSummaryWorker()

    return {
      ok: database.ok && redis.ok && backup.ok && backupWorker.ok && reminderWorker.ok && groupSummaryWorker.ok && openclaw.ok && whatsapp.ok,
      service: 'nara-backend',
      timestamp: new Date().toISOString(),
      dependencies: { database, redis, backup, backupWorker, reminderWorker, groupSummaryWorker, openclaw, whatsapp },
    }
  }
}

export const readinessService = new ReadinessService()
