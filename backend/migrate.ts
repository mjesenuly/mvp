import 'dotenv/config';
import { openRepository } from './storage';
if (!process.env.STORAGE || process.env.STORAGE === 'memory') throw new Error('Select STORAGE=sqlite or STORAGE=postgres before migrating.');
const repository = await openRepository();
try { console.log(`Migrations complete (${repository.kind}).`); } finally { await repository.close(); }
