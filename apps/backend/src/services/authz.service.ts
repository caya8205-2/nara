import type { FastifyReply, FastifyRequest } from 'fastify'

export type AccountType = 'operator' | 'user'

export type AuthSession = {
  sub: string
  role: string
  accountType: AccountType
}

export type ResourceAccess = {
  userId?: string | null
}

export type ResourceActor = {
  type: 'admin' | 'user'
  id?: string | null
}

export class AuthzService {
  async requireSession(req: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = await req.jwtVerify<{
        sub: string
        role?: string
        accountType?: string
      }>()

      if (payload.accountType !== 'operator' && payload.accountType !== 'user') {
        return reply.status(401).send({ error: 'Authentication required' })
      }

      req.authSession = {
        sub: payload.sub,
        role: payload.role ?? (payload.accountType === 'operator' ? 'operator' : 'user'),
        accountType: payload.accountType,
      }
    } catch {
      return reply.status(401).send({ error: 'Authentication required' })
    }
  }

  async requireOperator(req: FastifyRequest, reply: FastifyReply) {
    await this.requireSession(req, reply)
    if (reply.sent) return
    if (!this.isOperator(req.authSession)) {
      return reply.status(403).send({ error: 'Operator access required' })
    }
  }

  async requirePrivileged(req: FastifyRequest, reply: FastifyReply) {
    await this.requireSession(req, reply)
    if (reply.sent) return
    if (!this.isPrivileged(req.authSession)) {
      return reply.status(403).send({ error: 'Admin access required' })
    }
  }

  requireUserOwnerOrPrivileged(paramName = 'id') {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      await this.requireSession(req, reply)
      if (reply.sent) return
      if (this.isPrivileged(req.authSession)) return

      const params = req.params as Record<string, unknown>
      if (req.authSession?.accountType === 'user' && req.authSession.sub === params[paramName]) {
        return
      }

      return reply.status(403).send({ error: 'Forbidden' })
    }
  }

  session(req: FastifyRequest) {
    if (!req.authSession) throw new Error('Authentication required')
    return req.authSession
  }

  isOperator(session?: AuthSession) {
    return session?.accountType === 'operator'
  }

  isAdminUser(session?: AuthSession) {
    return session?.accountType === 'user' && session.role === 'admin'
  }

  isPrivileged(session?: AuthSession) {
    return this.isOperator(session) || this.isAdminUser(session)
  }

  userOwnedAccess(session: AuthSession): ResourceAccess | undefined {
    return this.isPrivileged(session) ? undefined : { userId: session.sub }
  }

  legacyOperatorGlobalAccess(session: AuthSession): ResourceAccess {
    return session.accountType === 'user'
      ? this.isAdminUser(session) ? {} : { userId: session.sub }
      : { userId: null }
  }

  requestedUserId(session: AuthSession, requested?: string | null) {
    return this.isPrivileged(session) ? requested ?? null : session.sub
  }

  actor(session: AuthSession): ResourceActor {
    return session.accountType === 'user' && !this.isAdminUser(session)
      ? { type: 'user', id: session.sub }
      : { type: 'admin', id: null }
  }
}

export const authzService = new AuthzService()

declare module 'fastify' {
  interface FastifyRequest {
    authSession?: AuthSession
  }
}
