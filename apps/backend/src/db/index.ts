import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'
import { env } from '../config/env.js'

const client = postgres(env.DATABASE_URL, {
  connect_timeout: 10,
  idle_timeout: 30,
  max: 10,
})

export const db = drizzle(client, { schema })
