import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

const envFile = `.env.${process.env.NODE_ENV || 'development'}`
const envPath = path.resolve(process.cwd(), envFile)

if (!fs.existsSync(envPath)) {
  throw new Error(`${envFile} not found at ${envPath}`)
}

dotenv.config({ path: envPath })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL missing after dotenv load')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function destroy() {
  const client = await pool.connect()

  try {
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
    `)

    console.log('Database completely cleared')
  } catch (err) {
    console.error(err)
  } finally {
    client.release()
    process.exit(0)
  }
}

destroy()