import { relations } from 'drizzle-orm';
import { contactRequests } from './contact.schema';

export const contactRelations = relations(contactRequests, () => ({}));