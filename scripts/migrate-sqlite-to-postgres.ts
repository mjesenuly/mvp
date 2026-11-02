import 'dotenv/config';
import { PostgresRepository } from '../backend/postgres';
import { transferSqlite } from '../backend/transfer';

const [source, backup] = process.argv.slice(2);
if (!source || !backup || !process.env.DATABASE_URL) {
  throw new Error('Usage: DATABASE_URL=... npm run migrate:data -- SOURCE.sqlite NEW-BACKUP.sqlite (stop both applications first)');
}
const target = await PostgresRepository.open(process.env.DATABASE_URL, process.env.DATABASE_SCHEMA ?? 'public');
try {
  console.log('Transfer verified:', await transferSqlite(source, backup, target));
} finally { await target.close(); }
