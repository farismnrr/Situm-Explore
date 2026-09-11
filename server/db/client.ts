import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

let db: ReturnType<typeof drizzle> | undefined

function databaseSchema(value: unknown) {
  const schema = typeof value === 'string' ? value : ''
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) {
    throw createError({ statusCode: 500, statusMessage: 'DATABASE_SCHEMA is invalid.' })
  }
  return schema
}

export function getDb() {
  const config = useRuntimeConfig()
  if (!config.databaseUrl) throw createError({ statusCode: 500, statusMessage: 'DATABASE_URL is not configured.' })
  const schema = databaseSchema(process.env.DATABASE_SCHEMA || config.databaseSchema)
  db ||= drizzle(new Pool({
    connectionString: config.databaseUrl,
    options: `-c search_path=${schema},public`,
  }))
  return db
}
