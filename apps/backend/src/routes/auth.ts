import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { env } from '../config/env.js'

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

const plugin: FastifyPluginAsync = async (app) => {
  app.post('/login', async (req, reply) => {
    const body = LoginSchema.parse(req.body)

    if (
      body.username !== env.OPERATOR_USERNAME ||
      body.password !== env.OPERATOR_PASSWORD
    ) {
      return reply.status(401).send({ error: 'Invalid operator credentials' })
    }

    const token = app.jwt.sign(
      { sub: body.username, role: 'operator' },
      { expiresIn: '12h' }
    )

    return {
      token,
      operator: {
        username: body.username,
        role: 'operator',
      },
    }
  })

  app.get('/me', async (req, reply) => {
    try {
      const payload = await req.jwtVerify<{ sub: string; role: string }>()
      return {
        operator: {
          username: payload.sub,
          role: payload.role,
        },
      }
    } catch {
      return reply.status(401).send({ error: 'Authentication required' })
    }
  })
}

export default plugin
