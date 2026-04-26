import 'dotenv/config';
import { Pool } from 'pg';

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('dpg-')
        ? { rejectUnauthorized: false }
        : false,
})

db.on('error', (err) => {
    console.error('Unexpected DB error', err);
  });
