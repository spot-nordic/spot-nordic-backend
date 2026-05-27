import { pgTable, text, timestamp, integer, uuid, boolean } from 'drizzle-orm/pg-core';
import { publicationStatusEnum } from '../shared/enums';
import { users } from '../user/user.schema';

export const documentationNodes = pgTable('documentation_nodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  parentId: uuid('parent_id').references((): any => documentationNodes.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0).notNull(),
  isGroup: boolean('is_group').default(false).notNull(),
  htmlContent: text('html_content'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  status: publicationStatusEnum('status').default('DRAFT').notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const documentationAssets = pgTable('documentation_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  nodeId: uuid('node_id').references(() => documentationNodes.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});