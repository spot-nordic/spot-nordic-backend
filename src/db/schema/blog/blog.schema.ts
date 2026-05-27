import { pgTable, text, timestamp, uuid, integer, pgEnum } from 'drizzle-orm/pg-core';
import { publicationStatusEnum } from '../shared/enums';
import { users } from '../user/user.schema';

export const interactionTypeEnum = pgEnum('interaction_type', ['LIKE', 'DISLIKE']);

export const blogs = pgTable('blogs', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  htmlContent: text('html_content').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
  status: publicationStatusEnum('status').default('DRAFT').notNull(),
  viewsCount: integer('views_count').default(0).notNull(),
  likesCount: integer('likes_count').default(0).notNull(),
  dislikesCount: integer('dislikes_count').default(0).notNull(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const blogComments = pgTable('blog_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  blogId: uuid('blog_id').references(() => blogs.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const blogInteractions = pgTable('blog_interactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  blogId: uuid('blog_id').references(() => blogs.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: interactionTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});