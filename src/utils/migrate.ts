import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load the production environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'production'}` });

const runMigration = async () => {
  console.log('⏳ Starting manual database migration...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    // This reads the SQL files from the /drizzle folder and applies them safely
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Production migration completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigration();