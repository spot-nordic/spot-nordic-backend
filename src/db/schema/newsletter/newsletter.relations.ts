import { relations } from 'drizzle-orm';
import { subscribers, newsletters } from './newsletter.schema';

export const subscribersRelations = relations(subscribers, () => ({}));
export const newslettersRelations = relations(newsletters, () => ({}));