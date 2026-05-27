import { relations } from 'drizzle-orm';
import { documentationNodes, documentationAssets } from './documentation.schema';
import { users } from '../user/user.schema';

export const documentationNodesRelations = relations(documentationNodes, ({ one, many }) => ({
  author: one(users, {
    fields: [documentationNodes.authorId],
    references: [users.id],
  }),
  parent: one(documentationNodes, {
    fields: [documentationNodes.parentId],
    references: [documentationNodes.id],
    relationName: 'documentation_tree',
  }),
  children: many(documentationNodes, {
    relationName: 'documentation_tree',
  }),
  assets: many(documentationAssets),
}));

export const documentationAssetsRelations = relations(documentationAssets, ({ one }) => ({
  node: one(documentationNodes, {
    fields: [documentationAssets.nodeId],
    references: [documentationNodes.id],
  }),
}));