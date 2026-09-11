import { defineConfig } from 'drizzle-kit'

const databaseSchema = process.env.DATABASE_SCHEMA || ''
if (!databaseSchema || !/^[a-z_][a-z0-9_]*$/.test(databaseSchema)) {
  throw new Error('DATABASE_SCHEMA must be configured as a lowercase PostgreSQL identifier.')
}

const databaseUrl = process.env.DATABASE_URL || ''
const migrationUrl = databaseUrl
  ? (() => {
      const url = new URL(databaseUrl)
      url.searchParams.set('options', `-c app.schema=${databaseSchema} -c search_path=${databaseSchema},public`)
      return url.toString()
    })()
  : ''

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: migrationUrl },
})
