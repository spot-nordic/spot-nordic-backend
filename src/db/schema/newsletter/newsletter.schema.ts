import { pgTable, text, timestamp, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';
import { newsletterStatusEnum } from '../shared/enums';

export const subscribers = pgTable('subscribers', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  preferences: jsonb('preferences').default({ products: true, blogs: true, sms: true }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const newsletters = pgTable('newsletters', {
  id: uuid('id').defaultRandom().primaryKey(),
  subject: text('subject').notNull(),
  htmlContent: text('html_content').notNull(),
  status: newsletterStatusEnum('status').default('DRAFT').notNull(),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});