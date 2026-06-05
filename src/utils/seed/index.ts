import { seedUsers } from './user.seed';
import { seedProductsAndOrders } from './product.seed';
import { seedFaqs } from './faq.seed';
import { seedPrivacy } from './privacy.seed';
import { seedTerms } from './terms.seed';
import { seedBlogs } from './blog.seed';
import { seedContacts } from './contact.seed';
import { seedDocs } from './documentation.seed';
import { seedTickets } from './ticket.seed';
import { db } from '../../configs/db.config';
import { sql } from 'drizzle-orm';

const destroyAll = async () => {
  console.log('🗑️ Destroying existing data...');
  await db.execute(sql`TRUNCATE TABLE users, products, product_categories, faqs, privacy_policies, terms_conditions, blogs, contact_requests, support_tickets, ticket_messages, orders, order_items, carts, cart_items, auth_tokens, documentation_nodes, documentation_assets, chat_messages RESTART IDENTITY CASCADE`);
  console.log('✅ Database cleared');
};

const runSeed = async () => {
  try {
    const isDestroy = process.argv.includes('-d');
    
    if (isDestroy) {
      await destroyAll();
    }
    
    await seedUsers();
    await seedProductsAndOrders();
    await seedFaqs();
    await seedPrivacy();
    await seedTerms();
    // await seedBlogs();
    await seedContacts();
    // await seedDocs();
    await seedTickets();
    
    console.log('🎉 Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    process.exit();
  }
};

runSeed();