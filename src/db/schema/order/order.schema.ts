import { pgTable, text, timestamp, doublePrecision, integer, uuid } from 'drizzle-orm/pg-core';
import { orderStatusEnum, paymentStatusEnum } from '../shared/enums';
import { users } from '../user/user.schema';
import { products } from '../product/product.schema';

export const carts = pgTable('carts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(),
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
  totalSubtotal: doublePrecision('total_subtotal').notNull(),
  totalTax: doublePrecision('total_tax').notNull(),
  totalAmount: doublePrecision('total_amount').notNull(),
  taxCountry: text('tax_country').notNull(),
  taxPercentage: doublePrecision('tax_percentage').notNull(),
  currency: text('currency').default('EUR').notNull(), // Default updated to Euro
  conversionRate: doublePrecision('conversion_rate').default(1.0).notNull(),
  conversionCharge: doublePrecision('conversion_charge').default(0).notNull(),
  invoiceUrl: text('invoice_url'),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  paymentMethod: text('payment_method').notNull(), // e.g., 'PAYPAL' or 'WIRE_TRANSFER'
  paymentStatus: paymentStatusEnum('payment_status').default('PENDING').notNull(),
  paypalOrderId: text('paypal_order_id'),
  paypalPaymentId: text('paypal_payment_id'),
  shippingStreet: text('shipping_street').notNull(),
  shippingCity: text('shipping_city').notNull(),
  shippingState: text('shipping_state').notNull(),
  shippingPincode: text('shipping_pincode').notNull(),
  shippingCountry: text('shipping_country').notNull(),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'restrict' }).notNull(),
  quantity: integer('quantity').notNull(),
  price: doublePrecision('price').notNull(),
  originalPrice: doublePrecision('original_price').notNull(),
});