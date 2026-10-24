import { sql } from 'drizzle-orm'
import { check, foreignKey, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

const createdAt = () => integer('created_at', { mode: 'timestamp_ms' })
  .default(sql`(unixepoch() * 1000)`)
  .notNull()
const updatedAt = () => integer('updated_at', { mode: 'timestamp_ms' })
  .default(sql`(unixepoch() * 1000)`)
  .notNull()

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value'),
  createdAt: createdAt(),
})

export const users = sqliteTable('users', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  sessionVersion: integer('session_version').default(0).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [
  check('users_email_normalized_check', sql`${table.email} = lower(${table.email})`),
])

export const registrationVerificationCodes = sqliteTable('registration_verification_codes', {
  email: text('email').primaryKey(),
  codeHash: text('code_hash').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  resendAvailableAt: integer('resend_available_at', { mode: 'timestamp_ms' }).notNull(),
  failedAttempts: integer('failed_attempts').default(0).notNull(),
  consumedAt: integer('consumed_at', { mode: 'timestamp_ms' }),
  createdAt: createdAt(),
}, table => [
  check('registration_verification_codes_email_normalized_check', sql`${table.email} = lower(${table.email})`),
  check('registration_verification_codes_failed_attempts_check', sql`${table.failedAttempts} >= 0`),
])

export const providerIdentities = sqliteTable('provider_identities', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  createdAt: createdAt(),
}, table => [
  foreignKey({ columns: [table.userId], foreignColumns: [users.id] }).onDelete('cascade'),
  unique('provider_account_unique').on(table.provider, table.providerAccountId),
])

export const workspaces = sqliteTable('workspaces', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [
  foreignKey({ columns: [table.ownerId], foreignColumns: [users.id] }).onDelete('cascade'),
])

export const workspaceSitumConfigs = sqliteTable('workspace_situm_configs', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  workspaceId: text('workspace_id').notNull().unique(),
  situmAccountId: text('situm_account_id').notNull(),
  encryptedApiKey: text('encrypted_api_key'),
  encryptedViewerApiKey: text('encrypted_viewer_api_key'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [
  foreignKey({ columns: [table.workspaceId], foreignColumns: [workspaces.id] }).onDelete('cascade'),
])

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type ProviderIdentity = typeof providerIdentities.$inferSelect
export type Workspace = typeof workspaces.$inferSelect
export type NewWorkspace = typeof workspaces.$inferInsert
export type WorkspaceSitumConfig = typeof workspaceSitumConfigs.$inferSelect
