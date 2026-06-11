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
  BACKUP_DIR: z.string().optional(),
  REPORTS_DIR: z.string().optional(),
  POSTGRES_CONTAINER_NAME: z.string().default('nara-postgres-1'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  AGENT_API_SECRET: z.string().min(1, 'AGENT_API_SECRET is required'),
  OPERATOR_USERNAME: z.string().min(1, 'OPERATOR_USERNAME is required'),
  OPERATOR_PASSWORD: z.string().min(12, 'OPERATOR_PASSWORD must be at least 12 characters'),
})

export const env = EnvSchema.parse(process.env)
