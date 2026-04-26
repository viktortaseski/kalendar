import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './src/dbConn.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

async function run() {
  console.log('Running migrations...');

  // 1. Tracking table — records which migrations have been applied.
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 2. Find which files are already applied.
  const { rows } = await db.query('SELECT filename FROM _migrations');
  const applied = new Set(rows.map((r) => r.filename));

  // 3. Read migration files in alphabetical order. The 001_, 002_ prefix
  //    is what enforces correct ordering.
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // 4. Apply each pending migration inside a transaction.
  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`  → applying ${file}`);

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      count++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✘ ${file} failed:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  if (count === 0) {
    console.log('Already up to date.');
  } else {
    console.log(`✔ Applied ${count} migration(s).`);
  }

  await db.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
