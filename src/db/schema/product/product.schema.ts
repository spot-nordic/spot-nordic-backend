import { pgTable, text, timestamp, doublePrecision, integer, uuid, boolean } from 'drizzle-orm/pg-core';
import { contentStatusEnum } from '../shared/enums';
import { users } from '../user/user.schema';

export const productCategories = pgTable('product_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  parentId: uuid('parent_id').references((): any => productCategories.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0).notNull(),
  status: contentStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  categoryId: uuid('category_id').references(() => productCategories.id, { onDelete: 'restrict' }).notNull(),
  description: text('description').notNull(),
  images: text('images').array().notNull(),
  basePrice: doublePrecision('base_price').notNull(),
  discountPercentage: doublePrecision('discount_percentage').default(0).notNull(),
  stock: integer('stock').default(0).notNull(),
  status: contentStatusEnum('status').default('ACTIVE').notNull(),
  averageRating: doublePrecision('average_rating').default(0).notNull(),
  totalReviews: integer('total_reviews').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productReviews = pgTable('product_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  isVisible: boolean('is_visible').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});