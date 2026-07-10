import { pgTable, text, timestamp, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';
import { roleEnum, userStatusEnum, tokenTypeEnum, messageDeliveryStatusEnum } from '../shared/enums';

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    role: roleEnum('role').default('USER').notNull(),
    status: userStatusEnum('status').default('ACTIVE').notNull(),
    isEmailVerified: boolean('is_email_verified').default(false).notNull(),
    refreshToken: text('refresh_token'),
    metadata: jsonb('metadata'),
    permissions: jsonb('permissions'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const authTokens = pgTable('auth_tokens', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    token: text('token').notNull().unique(),
    type: tokenTypeEnum('type').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    receiverId: uuid('receiver_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    deliveryStatus: messageDeliveryStatusEnum('delivery_status').default('SENT').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});