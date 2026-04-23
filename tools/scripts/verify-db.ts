import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyTables() {
  const client = await pool.connect();

  try {
    const sqlPath = path.resolve(process.cwd(), 'init.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running init.sql to create missing tables...');
    await client.query(sqlContent);

    // Extract expected table names
    const tableMatches = sqlContent.match(/CREATE TABLE IF NOT EXISTS "([^"]+)"/g);

    if (!tableMatches) {
      console.log('No tables found in init.sql');
      process.exit(0);
    }

    const expectedTables = tableMatches
      .map((m) => m.match(/"([^"]+)"/)?.[1])
      .filter(Boolean) as string[];

    console.log(`Checking ${expectedTables.length} tables...`);

    let allExist = true;

    for (const table of expectedTables) {
      const result = await client.query(
        `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
        `,
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

    if (allExist) {
      console.log('All tables verified successfully.');
    } else {
      console.error('Some tables are missing.');
      process.exit(1);
    }

    console.log('Verifying columns for all tables...');
    for (const table of expectedTables) {
      const tableContentMatch = sqlContent.match(
        new RegExp(`CREATE TABLE IF NOT EXISTS "${table}" \\(([^)]+)\\);`, 's'),
      );
      if (tableContentMatch) {
        const tableContent = tableContentMatch[1];
        const columnMatches = [...tableContent.matchAll(/"([^"]+)"/g)];
        const expectedColumns = columnMatches.map((m) => m[1]).filter((c) => c !== table);

        const dbColumnsResult = await client.query(
          `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = $1;
          `,
          [table],
        );
        const existingColumns = dbColumnsResult.rows.map((row) => row.column_name);

        for (const column of expectedColumns) {
          if (!existingColumns.includes(column)) {
            console.log(`Adding column "${column}" to table "${table}"...`);
            const columnDefMatch = tableContent.match(new RegExp(`"${column}" ([^,]+)`));
            if (columnDefMatch) {
              const columnDef = columnDefMatch[0];
              await client.query(`ALTER TABLE "${table}" ADD COLUMN ${columnDef};`);
            }
          }
        }
      }
    }
    console.log('All columns verified successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error verifying database:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyTables();
