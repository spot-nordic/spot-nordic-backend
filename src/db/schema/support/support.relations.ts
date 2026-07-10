import { relations } from 'drizzle-orm';
import { supportTickets, ticketMessages } from './support.schema';
import { users } from '../user/user.schema';
import { orders } from '../order/order.schema';

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
    user: one(users, {
        fields: [supportTickets.userId],
        references: [users.id],
    }),
    order: one(orders, {
        fields: [supportTickets.orderId],
        references: [orders.id],
    }),
    messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
    ticket: one(supportTickets, {
        fields: [ticketMessages.ticketId],
        references: [supportTickets.id],
    }),
    sender: one(users, {
        fields: [ticketMessages.senderId],
        references: [users.id],
    }),
}));