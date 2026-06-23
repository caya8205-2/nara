import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { ZodError } from 'zod'
import { env } from './config/env.js'
import { backendLogService } from './services/backend-log.service.js'
import { backupWorkerService } from './services/backup-worker.service.js'
import { reminderWorkerService } from './services/reminder-worker.service.js'
import { reportWorkerService } from './services/report-worker.service.js'
import { rateLimitService } from './services/rate-limit.service.js'

declare module 'fastify' {
  interface FastifyRequest {
    startTime?: bigint
  }
}

const app = Fastify({
  logger: true,
  trustProxy: env.TRUST_PROXY,
})

const corsOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : env.NODE_ENV === 'production'
    ? false
    : true

app.register(cors, { origin: corsOrigins })
app.register(jwt, { secret: env.JWT_SECRET })

app.addHook('onRequest', async (request) => {
  request.startTime = process.hrtime.bigint()
})

app.addHook('onRequest', async (request, reply) => {
  if (rateLimitService.shouldSkip({
    ip: request.ip,
    method: request.method,
    url: request.url,
  })) {
    return
  }

  const result = rateLimitService.check({
    ip: request.ip,
    method: request.method,
    url: request.url,
  })

  reply.header('X-RateLimit-Limit', result.limit)
  reply.header('X-RateLimit-Remaining', result.remaining)
  reply.header('X-RateLimit-Reset', result.resetAt.toISOString())

  if (!result.allowed) {
    reply.header('Retry-After', result.retryAfterSeconds)
    return reply.status(429).send({
      error: 'Too many requests. Please try again shortly.',
    })
  }
})

app.addHook('onResponse', async (request, reply) => {
  const startTime = request.startTime
  const durationMs = startTime
    ? Number(process.hrtime.bigint() - startTime) / 1_000_000
    : undefined

  await backendLogService.write({
    level: reply.statusCode >= 500 ? 'error' : 'info',
    event: 'request.completed',
    requestId: request.id,
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    durationMs,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  })
})

app.addHook('onError', async (request, reply, error) => {
  const startTime = request.startTime
  const durationMs = startTime
    ? Number(process.hrtime.bigint() - startTime) / 1_000_000
    : undefined

  await backendLogService.writeError({
    event: 'request.failed',
    requestId: request.id,
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    durationMs,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    error,
  })
})

app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, 'request failed')

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation failed',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }

  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      error: error.message,
    })
  }

  return reply.status(500).send({
    error: 'Internal server error',
  })
})

app.setNotFoundHandler((request, reply) => {
  return reply.status(404).send({
    error: 'Route not found',
    path: request.url,
  })
})

process.on('unhandledRejection', (reason) => {
  app.log.error({ reason }, 'unhandled promise rejection')
  void backendLogService.writeError({
    event: 'process.unhandled_rejection',
    error: reason,
  })
})

process.on('uncaughtException', (error) => {
  app.log.fatal({ err: error }, 'uncaught exception')
  void backendLogService.writeError({
    level: 'fatal',
    event: 'process.uncaught_exception',
    error,
  })
  process.exit(1)
})

process.on('SIGINT', () => {
  reminderWorkerService.stop()
  backupWorkerService.stop()
  reportWorkerService.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  reminderWorkerService.stop()
  backupWorkerService.stop()
  reportWorkerService.stop()
  process.exit(0)
})

// Health check
app.get('/', async () => ({
  status: 'ok',
  service: 'nara-backend',
  message: 'Nara backend is running. Use /health for liveness and /api/readiness for dependency readiness.',
  timestamp: new Date().toISOString(),
}))

app.get('/health', async () => ({
  status: 'ok',
  service: 'nara-backend',
  workers: {
    backup: backupWorkerService.getStatus(),
    reminder: reminderWorkerService.getStatus(),
  },
  timestamp: new Date().toISOString(),
}))

// Routes
app.register(import('./routes/readiness.js'), { prefix: '/api/readiness' })
app.register(import('./routes/auth.js'), { prefix: '/api/auth' })
app.register(import('./routes/tasks.js'), { prefix: '/api/tasks' })
app.register(import('./routes/reminders.js'), { prefix: '/api/reminders' })
app.register(import('./routes/approvals.js'), { prefix: '/api/approvals' })
app.register(import('./routes/users.js'), { prefix: '/api/users' })
app.register(import('./routes/agent-access.js'), { prefix: '/api/agent-access' })
app.register(import('./routes/agent-tools.js'), { prefix: '/api/agent' })
app.register(import('./routes/logs.js'), { prefix: '/api/logs' })
app.register(import('./routes/backup.js'), { prefix: '/api/backup' })
app.register(import('./routes/reports.js'), { prefix: '/api/reports' })
app.register(import('./routes/clients.js'), { prefix: '/api/clients' })
app.register(import('./routes/context.js'), { prefix: '/api/context' })

// Stubs - uncomment as implemented

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    reminderWorkerService.start(app.log)
    backupWorkerService.start(app.log)
    reportWorkerService.start(app.log)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
