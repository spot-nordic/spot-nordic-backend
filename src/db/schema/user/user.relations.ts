import { relations } from 'drizzle-orm';
import { users, authTokens, chatMessages } from './user.schema';
import { orders, carts } from '../order/order.schema';
import { blogs } from '../blog/blog.schema';
import { documentationNodes } from '../documentation/documentation.schema';
import { supportTickets, ticketMessages } from '../support/support.schema';

export const usersRelations = relations(users, ({ one, many }) => ({
    authTokens: many(authTokens),
    cart: one(carts, {
        fields: [users.id],
        references: [carts.userId],
    }),
    orders: many(orders),
    supportTickets: many(supportTickets),
    ticketMessages: many(ticketMessages),
    sentChatMessages: many(chatMessages, { relationName: 'chat_sender' }),
    receivedChatMessages: many(chatMessages, { relationName: 'chat_receiver' }),
    blogs: many(blogs),
    documentationNodes: many(documentationNodes),
}));

export const authTokensRelations = relations(authTokens, ({ one }) => ({
    user: one(users, {
        fields: [authTokens.userId],
        references: [users.id],
    }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
    sender: one(users, {
        fields: [chatMessages.senderId],
        references: [users.id],
        relationName: 'chat_sender',
    }),
    receiver: one(users, {
        fields: [chatMessages.receiverId],
        references: [users.id],
        relationName: 'chat_receiver',
    }),
}));