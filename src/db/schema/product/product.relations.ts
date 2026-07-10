import { relations } from 'drizzle-orm';
import { productCategories, products, productReviews } from './product.schema';
import { cartItems, orderItems } from '../order/order.schema';
import { users } from '../user/user.schema';

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  products: many(products),
  parent: one(productCategories, {
    fields: [productCategories.parentId],
    references: [productCategories.id],
    relationName: 'category_tree',
  }),
  children: many(productCategories, {
    relationName: 'category_tree',
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  reviews: many(productReviews),
}));

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  product: one(products, {
    fields: [productReviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [productReviews.userId],
    references: [users.id],
  }),
}));