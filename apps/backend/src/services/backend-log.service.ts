import { mkdir, appendFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'

export type BackendLogEvent = {
  level: 'info' | 'warn' | 'error' | 'fatal'
  event: string
  requestId?: string
  method?: string
  url?: string
  statusCode?: number
  durationMs?: number
  ip?: string
  userAgent?: string
  error?: {
    name?: string
    message: string
    stack?: string
  }
  metadata?: Record<string, unknown>
}

const logDir = env.BACKEND_LOG_DIR ?? path.resolve(process.cwd(), '../../.tmp/logs')
const logFile = path.join(logDir, 'backend.ndjson')

export const backendLogFilePath = logFile

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    message: String(error),
  }
}

class BackendLogService {
  async write(event: BackendLogEvent) {
    const record = {
      timestamp: new Date().toISOString(),
      service: 'nara-backend',
      ...event,
    }

    try {
      await mkdir(logDir, { recursive: true })
      await appendFile(logFile, `${JSON.stringify(record)}\n`, 'utf8')
    } catch (error) {
      // File logging must never break API requests.
      console.error('Failed to write backend log', serializeError(error))
    }
  }

  writeError(
    event: Omit<BackendLogEvent, 'level' | 'error'> & {
      level?: 'error' | 'fatal'
      error: unknown
    },
  ) {
    return this.write({
      ...event,
      level: event.level ?? 'error',
      error: serializeError(event.error),
    })
  }
}

export const backendLogService = new BackendLogService()
