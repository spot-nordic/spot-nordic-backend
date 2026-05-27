import { relations } from 'drizzle-orm';
import { privacyPolicies } from './privacy.schema';

export const privacyRelations = relations(privacyPolicies, () => ({}));