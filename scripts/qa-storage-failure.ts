import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import { SqliteRepository } from '../backend/sqlite';
import { createApp } from '../backend/server';

const dir = await mkdtemp(path.join(os.tmpdir(), 'repairlens-qa-export-'));
const file = path.join(dir, 'db.sqlite');
const repo = await SqliteRepository.open(file);
const backend = await createApp({ repository: repo });
const server = await new Promise<Server>(resolve => { const s = backend.app.listen(0, '127.0.0.1', () => resolve(s)); });
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
try {
  const auth = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'QA export', email: 'export@example.test', password: 'Password123!', role: 'customer', contact: 'fictional' }) });
  assert.equal(auth.status, 200);
  const session = await auth.json();
  // TypeORM's SQL.js driver exposes this documented autosave hook. Inject only
  // in an isolated disposable QA DB to verify failed durability is not success.
  const options = repo.db.options as unknown as { autoSaveCallback?: (data: Uint8Array) => Promise<void> };
  options.autoSaveCallback = async () => { throw new Error('QA simulated durable export failure'); };
  const failed = await fetch(base + '/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json',
    Cookie: auth.headers.get('set-cookie')!.split(';')[0], 'X-CSRF-Token': session.csrfToken },
    body: JSON.stringify({ category: 'Laptop', brand: 'A', model: 'B', city: 'Almaty', fault: 'Fault' }) });
  assert.notEqual(failed.status, 200);
  assert.equal(backend.engine.requests.length, 0);
  delete options.autoSaveCallback;
  const disk = await SqliteRepository.open(file);
  try { assert.equal((await disk.load())!.requests.length, 0); }
  finally { await disk.close(); }
  console.log('PASS SQLite export failure: HTTP not successful, domain rolled back, prior on-disk state unchanged');
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await backend.close();
  await rm(dir, { recursive: true, force: true });
}
