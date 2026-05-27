import { db } from '../../configs/db.config';
import { supportTickets, users } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const seedTickets = async () => {
  const user = await db.select().from(users).where(eq(users.role, 'USER'));
  if (user.length > 0) {
    await db.insert(supportTickets).values({
      userId: user[0].id,
      subject: 'Damaged Item Received',
      description: 'The Wooden Lamp arrived with a crack in the base.',
      status: 'OPEN',
    });
    console.log('✅ Tickets seeded');
  }
};