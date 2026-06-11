import { and, desc, gte, ilike, lte, or } from 'drizzle-orm'
import { db } from '../db/index.js'
import { auditLogs } from '../db/schema.js'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogSource = 'backend' | 'database' | 'redis' | 'openclaw' | 'agent' | 'system'

export interface ListLogsInput {
  source?: LogSource
  level?: LogLevel
  search?: string
  from?: string
  to?: string
  limit?: number
}

export interface LogEntry {
  id: string
  timestamp: string
  source: LogSource
  level: LogLevel
  message: string
  metadata?: Record<string, unknown>
}

const parseMetadata = (value: string | null) => {
  if (!value) return undefined

  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null
      ? parsed as Record<string, unknown>
      : { value: parsed }
  } catch {
    return { raw: value }
  }
}

const getSource = (action: string, targetType: string): LogSource => {
  if (action.includes('agent') || targetType.includes('agent')) return 'agent'
  if (action.includes('openclaw') || targetType.includes('openclaw')) return 'openclaw'
  if (targetType.includes('database')) return 'database'
  return 'system'
}

const getLevel = (action: string, metadata?: Record<string, unknown>): LogLevel => {
  if (action.includes('failed') || metadata?.status === 'sync_failed') return 'error'
  if (action.includes('blocked') || metadata?.status === 'blocked') return 'warn'
  return 'info'
}

const formatMessage = (action: string, targetType: string) => {
  const label = action.replaceAll('.', ' ')
  return `${label} (${targetType})`
}

export class LogService {
  async listLogs(input: ListLogsInput = {}) {
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 500)
    const filters = []

    if (input.search) {
      const pattern = `%${input.search}%`
      filters.push(
        or(
          ilike(auditLogs.action, pattern),
          ilike(auditLogs.targetType, pattern),
          ilike(auditLogs.metadata, pattern),
        )
      )
    }

    if (input.from) filters.push(gte(auditLogs.createdAt, new Date(input.from)))
    if (input.to) filters.push(lte(auditLogs.createdAt, new Date(input.to)))

    const rows = await db
      .select()
      .from(auditLogs)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)

    const logs = rows
      .map((row): LogEntry => {
        const metadata = parseMetadata(row.metadata)
        const source = getSource(row.action, row.targetType)
        const level = getLevel(row.action, metadata)

        return {
          id: row.id,
          timestamp: (row.createdAt ?? new Date()).toISOString(),
          source,
          level,
          message: formatMessage(row.action, row.targetType),
          metadata: {
            actorType: row.actorType,
            actorId: row.actorId,
            targetId: row.targetId,
            ...metadata,
          },
        }
      })
      .filter((log) => !input.source || log.source === input.source)
      .filter((log) => !input.level || log.level === input.level)

    return {
      logs,
      total: logs.length,
      hasMore: rows.length === limit,
    }
  }
}

export const logService = new LogService()
