import { relations } from 'drizzle-orm';
import { blogs, blogComments, blogInteractions } from './blog.schema';
import { users } from '../user/user.schema';

export const blogsRelations = relations(blogs, ({ one, many }) => ({
  author: one(users, {
    fields: [blogs.authorId],
    references: [users.id],
  }),
  comments: many(blogComments),
  interactions: many(blogInteractions),
}));

export const blogCommentsRelations = relations(blogComments, ({ one }) => ({
  blog: one(blogs, {
    fields: [blogComments.blogId],
    references: [blogs.id],
  }),
  user: one(users, {
    fields: [blogComments.userId],
    references: [users.id],
  }),
}));

export const blogInteractionsRelations = relations(blogInteractions, ({ one }) => ({
  blog: one(blogs, {
    fields: [blogInteractions.blogId],
    references: [blogs.id],
  }),
  user: one(users, {
    fields: [blogInteractions.userId],
    references: [users.id],
  }),
}));