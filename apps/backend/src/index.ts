import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { env } from './config/env.js'

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

// Health check
app.get('/health', async () => ({
  status: 'ok',
  service: 'nara-backend',
  timestamp: new Date().toISOString(),
}))

// Routes
app.register(import('./routes/readiness.js'), { prefix: '/api/readiness' })
app.register(import('./routes/auth.js'), { prefix: '/api/auth' })
app.register(import('./routes/tasks.js'), { prefix: '/api/tasks' })
app.register(import('./routes/users.js'), { prefix: '/api/users' })
app.register(import('./routes/agent-access.js'), { prefix: '/api/agent-access' })
app.register(import('./routes/agent-tools.js'), { prefix: '/api/agent' })
app.register(import('./routes/logs.js'), { prefix: '/api/logs' })
app.register(import('./routes/backup.js'), { prefix: '/api/backup' })

// Stubs - uncomment as implemented
// app.register(import('./routes/schedules.js'), { prefix: '/api/schedules' })
// app.register(import('./routes/reports.js'), { prefix: '/api/reports' })
// app.register(import('./routes/clients.js'), { prefix: '/api/clients' })

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
