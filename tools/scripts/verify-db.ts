import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function verifyTables() {
  try {
    const sqlPath = path.resolve(process.cwd(), 'init.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Extract table names
    const tableMatches = sqlContent.match(/CREATE TABLE IF NOT EXISTS "([^"]+)"/g);
    if (!tableMatches) {
      console.log('No tables found in init.sql');
      return;
    }

    const expectedTables = tableMatches
      .map((m) => m.match(/"([^"]+)"/)?.[1])
      .filter(Boolean) as string[];

    const client = await pool.connect();
    console.log(`Checking ${expectedTables.length} tables...`);

    let allExist = true;

    for (const table of expectedTables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );`,
        [table],
      );

      const exists = result.rows[0].exists;
      if (exists) {
        console.log(`✅ Table "${table}" exists.`);
      } else {
        console.error(`❌ Table "${table}" is missing!`);
        allExist = false;
      }
    }

    client.release();

    if (allExist) {
      console.log('All tables verified successfully.');
      process.exit(0);
    } else {
      console.error('Some tables are missing.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error verifying database:', error);
    process.exit(1);
  }
}

verifyTables();
