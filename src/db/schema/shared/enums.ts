import { pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['ADMIN', 'USER']);
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'BLOCKED']);
export const tokenTypeEnum = pgEnum('token_type', ['EMAIL_VERIFICATION', 'PASSWORD_RESET']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);
export const contentStatusEnum = pgEnum('content_status', ['ACTIVE', 'DISABLED']);
export const publicationStatusEnum = pgEnum('publication_status', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const ticketStatusEnum = pgEnum('ticket_status', ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
export const messageDeliveryStatusEnum = pgEnum('message_delivery_status', ['SENT', 'DELIVERED', 'READ']);
