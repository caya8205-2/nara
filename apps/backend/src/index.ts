import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { env } from './config/env.js'

const app = Fastify({ logger: true })

app.register(cors)
app.register(jwt, { secret: env.JWT_SECRET })

// Health check
app.get('/health', async () => ({
  status: 'ok',
  service: 'nara-backend',
  timestamp: new Date().toISOString(),
}))

// Routes
app.register(import('./routes/readiness.js'), { prefix: '/api/readiness' })
app.register(import('./routes/tasks.js'), { prefix: '/api/tasks' })
app.register(import('./routes/agent-tools.js'), { prefix: '/api/agent' })

// Stubs — uncomment as implemented
// app.register(import('./routes/schedules.js'), { prefix: '/api/schedules' })
// app.register(import('./routes/reports.js'), { prefix: '/api/reports' })
// app.register(import('./routes/auth.js'), { prefix: '/api/auth' })
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
