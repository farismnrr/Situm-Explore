import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

let db: BetterSQLite3Database<typeof schema> | undefined

export function getDb() {
  const config = useRuntimeConfig()
  const path = resolve(process.env.DATABASE_PATH || config.databasePath || 'data/senar.db')
  mkdirSync(dirname(path), { recursive: true })
  if (!db) {
    const sqlite = new Database(path)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    sqlite.pragma('busy_timeout = 5000')
    db = drizzle(sqlite, { schema })
  }
  return db
}
