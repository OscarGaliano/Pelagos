/**
 * Ejecuta las migraciones de Supabase contra la base de datos.
 * Uso: DATABASE_URL="postgresql://user:pass@host:5432/postgres" node scripts/run-migrations.js
 */
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', '..', 'supabase', 'migrations');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL. Ejemplo:');
  console.error('  DATABASE_URL="postgresql://postgres:PASSWORD@db.XXX.supabase.co:5432/postgres" node scripts/run-migrations.js');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

async function run() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No hay archivos .sql en supabase/migrations');
    return;
  }

  await client.connect();
  console.log('Conectado a la base de datos.\n');

  for (const file of files) {
    const path = join(migrationsDir, file);
    const sql = readFileSync(path, 'utf8');
    process.stdout.write(`Ejecutando ${file}... `);
    try {
      await client.query(sql);
      console.log('OK');
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        console.log('(ya existía)');
      } else {
        console.error('Error:', err.message);
        throw err;
      }
    }
  }

  await client.end();
  console.log('\nMigraciones aplicadas.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
