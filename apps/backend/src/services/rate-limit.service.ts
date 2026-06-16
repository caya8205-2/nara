import { env } from '../config/env.js'

export interface RateLimitInput {
  ip: string
  method: string
  url: string
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
  retryAfterSeconds: number
}

interface Bucket {
  count: number
  resetAt: number
}

export class RateLimitService {
  private buckets = new Map<string, Bucket>()

  check(input: RateLimitInput): RateLimitResult {
    const rule = this.ruleFor(input)
    const now = Date.now()
    this.cleanup(now)

    const key = `${rule.name}:${input.ip}`
    const existing = this.buckets.get(key)
    const bucket = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + env.RATE_LIMIT_WINDOW_MS }
      : existing

    bucket.count += 1
    this.buckets.set(key, bucket)

    const remaining = Math.max(rule.limit - bucket.count, 0)
    const retryAfterSeconds = Math.max(
      Math.ceil((bucket.resetAt - now) / 1000),
      1,
    )

    return {
      allowed: bucket.count <= rule.limit,
      limit: rule.limit,
      remaining,
      resetAt: new Date(bucket.resetAt),
      retryAfterSeconds,
    }
  }

  shouldSkip(input: RateLimitInput) {
    if (!env.RATE_LIMIT_ENABLED) return true
    if (input.method === 'OPTIONS') return true
    if (input.url === '/' || input.url === '/health') return true
    return input.method === 'GET' && input.url.startsWith('/api/readiness')
  }

  private ruleFor(input: RateLimitInput) {
    if (input.url.startsWith('/api/auth/login') ||
      input.url.startsWith('/api/auth/user-login') ||
      input.url.startsWith('/api/auth/register')) {
      return { name: 'auth', limit: env.AUTH_RATE_LIMIT_MAX }
    }

    if (input.url.startsWith('/api/agent')) {
      return { name: 'agent', limit: env.AGENT_RATE_LIMIT_MAX }
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(input.method)) {
      return { name: 'mutation', limit: env.MUTATION_RATE_LIMIT_MAX }
    }

    return { name: 'default', limit: env.RATE_LIMIT_MAX }
  }

  private cleanup(now: number) {
    if (this.buckets.size < 10_000) return

    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key)
    }
  }
}

export const rateLimitService = new RateLimitService()
