import 'dotenv/config';
import { Pool } from 'pg';

export const db = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_HOST?.includes('render.com') ? {
    rejectUnauthorized: false,
  } : false,
})

db.on('error', (err) => {
    console.error('Unexpected DB error', err);
  });
