import { and, desc, gte, ilike, lte, or } from 'drizzle-orm'
import { readFile } from 'node:fs/promises'
import { db } from '../db/index.js'
import { auditLogs } from '../db/schema.js'
import { backendLogFilePath, type BackendLogEvent } from './backend-log.service.js'

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

const parseBackendLogLine = (line: string): LogEntry | null => {
  try {
    const parsed = JSON.parse(line) as BackendLogEvent & {
      timestamp?: string
      service?: string
    }

    const level: LogLevel = parsed.level === 'fatal' ? 'error' : parsed.level
    const status = parsed.statusCode ? ` ${parsed.statusCode}` : ''
    const target = [parsed.method, parsed.url].filter(Boolean).join(' ')

    return {
      id: parsed.requestId ?? `${parsed.timestamp}-${parsed.event}`,
      timestamp: parsed.timestamp ?? new Date().toISOString(),
      source: 'backend',
      level,
      message: `${parsed.event}${target ? `: ${target}` : ''}${status}`,
      metadata: {
        requestId: parsed.requestId,
        method: parsed.method,
        url: parsed.url,
        statusCode: parsed.statusCode,
        durationMs: parsed.durationMs,
        ip: parsed.ip,
        userAgent: parsed.userAgent,
        error: parsed.error,
        ...parsed.metadata,
      },
    }
  } catch {
    return null
  }
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

    const auditEntries = rows
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

    const backendEntries = await this.listBackendLogs(input)
    const logs = [...auditEntries, ...backendEntries]
      .filter((log) => !input.source || log.source === input.source)
      .filter((log) => !input.level || log.level === input.level)
      .filter((log) => {
        if (!input.search) return true
        const haystack = `${log.message} ${JSON.stringify(log.metadata ?? {})}`.toLowerCase()
        return haystack.includes(input.search.toLowerCase())
      })
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, limit)

    return {
      logs,
      total: logs.length,
      hasMore: rows.length === limit || backendEntries.length === limit,
    }
  }

  private async listBackendLogs(input: ListLogsInput) {
    if (input.source && input.source !== 'backend') return []

    try {
      const raw = await readFile(backendLogFilePath, 'utf8')
      const from = input.from ? Date.parse(input.from) : null
      const to = input.to ? Date.parse(input.to) : null

      return raw
        .split('\n')
        .filter(Boolean)
        .slice(-(input.limit ?? 100) * 2)
        .map(parseBackendLogLine)
        .filter((log): log is LogEntry => log !== null)
        .filter((log) => {
          const time = Date.parse(log.timestamp)
          if (from !== null && time < from) return false
          if (to !== null && time > to) return false
          return true
        })
    } catch {
      return []
    }
  }
}

export const logService = new LogService()
