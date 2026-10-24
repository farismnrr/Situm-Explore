import { chmodSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

let db: BetterSQLite3Database<typeof schema> | undefined

export function getDb() {
  const config = useRuntimeConfig()
  const path = resolve(process.env.DATABASE_PATH || config.databasePath || 'data/senar.db')
  if (!db) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    chmodSync(dirname(path), 0o700)
    const sqlite = new Database(path)
    chmodSync(path, 0o600)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    sqlite.pragma('busy_timeout = 5000')
    db = drizzle(sqlite, { schema })
  }
  return db
}
