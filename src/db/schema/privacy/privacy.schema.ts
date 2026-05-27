import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

export const privacyPolicies = pgTable('privacy_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: text('version').notNull().unique(),
  title: text('title').notNull(),
  htmlContent: text('html_content').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});