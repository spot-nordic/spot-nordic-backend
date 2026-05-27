import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { contentStatusEnum } from '../shared/enums';

export const contactRequests = pgTable('contact_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: contentStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});