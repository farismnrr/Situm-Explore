import { sql } from 'drizzle-orm'
import { check, foreignKey, integer, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'

export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: varchar('value', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  sessionVersion: integer('session_version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, table => [
  check('users_email_normalized_check', sql`${table.email} = lower(${table.email})`),
])

export const providerIdentities = pgTable('provider_identities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, table => [
  foreignKey({ columns: [table.userId], foreignColumns: [users.id] }).onDelete('cascade'),
  unique('provider_account_unique').on(table.provider, table.providerAccountId),
])

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, table => [
  foreignKey({ columns: [table.ownerId], foreignColumns: [users.id] }).onDelete('cascade'),
])

export const workspaceSitumConfigs = pgTable('workspace_situm_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().unique(),
  situmAccountId: varchar('situm_account_id', { length: 255 }).notNull(),
  encryptedApiKey: varchar('encrypted_api_key', { length: 2048 }),
  encryptedViewerApiKey: varchar('encrypted_viewer_api_key', { length: 2048 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, table => [
  foreignKey({ columns: [table.workspaceId], foreignColumns: [workspaces.id] }).onDelete('cascade'),
])

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type ProviderIdentity = typeof providerIdentities.$inferSelect
export type Workspace = typeof workspaces.$inferSelect
export type NewWorkspace = typeof workspaces.$inferInsert
export type WorkspaceSitumConfig = typeof workspaceSitumConfigs.$inferSelect
