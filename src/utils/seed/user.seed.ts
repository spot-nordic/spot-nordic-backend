import { db } from '../../configs/db.config';
import { users } from '../../db/schema';
import bcrypt from 'bcryptjs';

export const seedUsers = async () => {
  const password = await bcrypt.hash('Admin123!', 10);
  await db.insert(users).values([
    {
      email: 'admin@spotnordic.com',
      password,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
    },
    {
      email: 'user@spotnordic.com',
      password,
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      status: 'ACTIVE',
      isEmailVerified: true,
    },
  ]);
  console.log('✅ Users seeded');
};