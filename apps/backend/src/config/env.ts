import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  TRUST_PROXY: z.coerce.boolean().default(false),
  CORS_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().url().optional(),
  OPENCLAW_GATEWAY_URL: z.string().url().optional(),
  OPENCLAW_GATEWAY_TOKEN: z.string().optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  AGENT_API_SECRET: z.string().min(1, 'AGENT_API_SECRET is required'),
})

export const env = EnvSchema.parse(process.env)
