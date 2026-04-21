import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

let finalConnectionString = connectionString;
if (connectionString && connectionString.startsWith('postgres')) {
  // If it already has an sslmode, replace it to avoid the security warning alias issue
  if (connectionString.includes('sslmode=')) {
    finalConnectionString = connectionString
      .replace('sslmode=require', 'sslmode=verify-full')
      .replace('sslmode=prefer', 'sslmode=verify-full')
      .replace('sslmode=verify-ca', 'sslmode=verify-full');
  } else {
    // Append it
    finalConnectionString = `${connectionString}${connectionString.includes('?') ? '&' : '?'}sslmode=verify-full`;
  }
}

const pool = new Pool({
  connectionString: finalConnectionString,
});

export default pool;
