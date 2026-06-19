import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { env } from '../config/env.js'
import { authzService } from '../services/authz.service.js'
import { identityService } from '../services/identity.service.js'

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

const RegisterSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

const UserLoginSchema = z.object({
  email: z.string().email(),
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
      { sub: body.username, role: 'operator', accountType: 'operator' },
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

  app.post('/register', async (req, reply) => {
    const body = RegisterSchema.parse(req.body)
    const user = await identityService.registerUser(body)

    if (!user) {
      return reply.status(409).send({ error: 'Email already registered' })
    }

    const token = app.jwt.sign(
      { sub: user.id, role: user.role, accountType: 'user' },
      { expiresIn: '30d' },
    )

    return reply.status(201).send({ token, user })
  })

  app.post('/user-login', async (req, reply) => {
    const body = UserLoginSchema.parse(req.body)
    const user = await identityService.verifyUserPassword(body.email, body.password)

    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' })
    }

    const token = app.jwt.sign(
      { sub: user.id, role: user.role, accountType: 'user' },
      { expiresIn: '30d' },
    )

    return { token, user }
  })

  app.get('/me', async (req, reply) => {
    await authzService.requireSession(req, reply)
    if (reply.sent) return

    const session = authzService.session(req)

    if (session.accountType === 'user') {
      const user = await identityService.getUserById(session.sub)
      if (!user) return reply.status(401).send({ error: 'User not found' })
      return { user }
    }

    return {
      operator: {
        username: session.sub,
        role: session.role,
      },
    }
  })
}

export default plugin
