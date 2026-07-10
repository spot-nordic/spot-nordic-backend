import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { ticketStatusEnum } from '../shared/enums';
import { users } from '../user/user.schema';
import { orders } from '../order/order.schema';

export const supportTickets = pgTable('support_tickets', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    subject: text('subject').notNull(),
    description: text('description').notNull(),
    status: ticketStatusEnum('status').default('OPEN').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ticketMessages = pgTable('ticket_messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id').references(() => supportTickets.id, { onDelete: 'cascade' }).notNull(),
    senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});