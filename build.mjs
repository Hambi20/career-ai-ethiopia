// build.mjs — Auto-detects database type and generates correct Prisma schema
import { execSync } from 'node:child_process';

const dbUrl = process.env.DATABASE_URL || '';

let schemaFlag = '--schema prisma/schema.prisma'; // Default: SQLite

if (dbUrl.startsWith('postgres')) {
  schemaFlag = '--schema prisma/schema.postgresql.prisma';
  console.log('[build] Detected PostgreSQL — using schema.postgresql.prisma');
} else if (dbUrl.startsWith('file:')) {
  console.log('[build] Detected SQLite — using schema.prisma');
} else {
  console.log('[build] No DATABASE_URL detected — using SQLite schema (default)');
}

try {
  execSync('npx prisma generate ' + schemaFlag, { stdio: 'inherit' });
  console.log('[build] Prisma client generated successfully.');
} catch (err) {
  console.error('[build] Prisma generate failed:', err.message);
  process.exit(1);
}
