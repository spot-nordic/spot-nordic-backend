import { relations } from 'drizzle-orm';
import { faqs } from './faq.schema';

export const faqRelations = relations(faqs, () => ({}));