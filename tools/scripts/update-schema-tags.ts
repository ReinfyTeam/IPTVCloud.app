import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateSchema() {
  const client = await pool.connect();
  try {
    console.log('Updating schema...');

    // Incident tags update
    await client.query(
      'ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT \'{}\'',
    );

    console.log('Schema updated successfully.');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateSchema();
