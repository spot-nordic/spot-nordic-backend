import { db } from '../../configs/db.config';
import { users } from '../../db/schema';
import bcrypt from 'bcryptjs';

export const seedUsers = async (): Promise<void> => {
  const password = await bcrypt.hash('12345678', 10);
  
  await db.insert(users).values([
    {
      email: 'subhashankarbehera7@gmail.com',
      password,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
      permissions: ['ALL'], 
    },
    {
      email: 'subhashankarb@gmail.com',
      password,
      firstName: 'Sub',
      lastName: 'Admin',
      role: 'SUBADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
      permissions: ['BLOGS', 'PRODUCTS'],
    },
    {
      email: 'pdfnotes66@gmail.com',
      password,
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      status: 'ACTIVE',
      isEmailVerified: true,
      permissions: [],
    },
  ]);
  
  console.log('Users seeded');
};

if (require.main === module) {
  seedUsers()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('User seeding failed:', err);
      process.exit(1);
    });
}