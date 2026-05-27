import { relations } from 'drizzle-orm';
import { termsConditions } from './terms.schema';

export const termsRelations = relations(termsConditions, () => ({}));