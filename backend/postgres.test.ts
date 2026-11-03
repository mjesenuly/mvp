import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import { isolatedPostgres } from './postgres-test-helper';
import { PostgresRepository } from './postgres';
import { SqliteRepository } from './sqlite';
import { transferSqlite, validateTransferState } from './transfer';
import { createApp } from './server';
import type { StoredState } from './repository';

const fixture = (): StoredState => {
  const terms = { kind: 'estimated' as const, fees: { labour: 2500000, parts: null, diagnostics: 0, optional: 50000 }, scope: 'Replace battery', days: 2, warranty: '90 days', exclusions: 'Unknown parts are additional' };
  return {
    accounts: [
      { id: 'customer', name: 'Fictional customer', email: 'customer@example.test', password: 'scrypt$fixture', role: 'customer', approved: true, contact: '+7 fictional' },
      { id: 'workshop', name: 'Fictional workshop', email: 'workshop@example.test', password: 'scrypt$fixture', role: 'workshop', approved: true, contact: '+7 fictional' },
    ],
    requests: [{ id: 'request', ownerId: 'customer', category: 'Laptop', brand: 'Lenovo', model: 'T14', fault: 'Battery', city: 'Almaty', contact: '+7 fictional', photos: [{ id: 'photo', name: 'fixture.png', url: 'data:image/png;base64,iVBORw0KGgo=' }], status: 'accepted', selectedId: 'offer', accepted: terms, history: ['2026-11-03T00:00:00.000Z · Offer accepted; terms preserved'] }],
    offers: [{ id: 'offer', requestId: 'request', workshopId: 'workshop', workshopName: 'Fictional workshop', terms, withdrawn: false }],
    sessions: [{ token: 'fictional-session', csrf: 'fictional-csrf', userId: 'customer', expires: 1900000000000 }], seq: 7,
  };
};
const canonical = (state: StoredState | null) => state && { ...state, accounts: [...state.accounts].sort((a, b) => a.id.localeCompare(b.id)) };

test('PostgreSQL migrations, multiple connections, rollback and restart preserve complete state', async () => {
  const h = await isolatedPostgres();
  let repository = h.repository;
  try {
    assert.equal(await repository.load(), null);
    assert.equal(await repository.db.showMigrations(), false);
    const state = fixture();
    await repository.save(state);
    // Independent instances can connect concurrently without holding a
    // session-wide lock across an entire Render rollout.
    const other = await PostgresRepository.open(h.url, h.schema);
    try {
      assert.deepEqual(canonical(await other.load()), canonical(state));
      const account = { ...state.accounts[0], id: 'another-user', email: 'other@example.test' };
      await other.withExclusive(async () => {
        const latest = (await other.load())!;
        await other.save({ ...latest, accounts: [...latest.accounts, account] });
      });
      await repository.withExclusive(async () => {
        const latest = (await repository.load())!;
        assert.ok(latest.accounts.some(a => a.id === 'another-user'));
        await repository.save(state);
      });
    } finally { await other.close(); }
    await assert.rejects(repository.save({ ...state, accounts: [...state.accounts, { ...state.accounts[0], id: 'duplicate' }] }));
    assert.deepEqual(canonical(await repository.load()), canonical(state));
    await assert.rejects(repository.save({ ...state, offers: [...state.offers, { ...state.offers[0], id: 'duplicate-offer' }] }));
    assert.deepEqual(canonical(await repository.load()), canonical(state));
    await repository.close();
    repository = await PostgresRepository.open(h.url, h.schema);
    assert.deepEqual(canonical(await repository.load()), canonical(state));
    assert.equal(await repository.db.showMigrations(), false);
  } finally { await repository.close(); await h.cleanup(); }
});

test('SQLite transfer preserves semantic payloads, source bytes and refuses occupied targets', async () => {
  const h = await isolatedPostgres();
  const folder = await mkdtemp(path.join(os.tmpdir(), 'repairlens-pg-transfer-test-'));
  const source = path.join(folder, 'source.sqlite');
  const backup = path.join(folder, 'backup.sqlite');
  const sqlite = await SqliteRepository.open(source);
  try {
    const state = fixture();
    await sqlite.save(state);
    await sqlite.close();
    const bytes = await readFile(source);
    const counts = await transferSqlite(source, backup, h.repository);
    assert.deepEqual(counts, { accounts: 2, requests: 1, offers: 1, sessions: 1 });
    assert.deepEqual(canonical(await h.repository.load()), canonical(state));
    assert.deepEqual(await readFile(source), bytes);
    assert.deepEqual(await readFile(backup), bytes);
    await assert.rejects(transferSqlite(source, path.join(folder, 'second.sqlite'), h.repository), /not empty/);
    assert.throws(() => validateTransferState({ ...state, accounts: [] }), /customer owner/);
    assert.throws(() => validateTransferState({ ...state, offers: [] }), /accepted offer/);
  } finally { await sqlite.close(); await h.cleanup(); await rm(folder, { recursive: true, force: true }); }
});

test('real HTTP account/session/request persist through PostgreSQL adapter and app restart', async () => {
  const h = await isolatedPostgres();
  let backend = await createApp({ repository: h.repository });
  const start = () => new Promise<Server>(resolve => { const server = backend.app.listen(0, '127.0.0.1', () => resolve(server)); });
  let server = await start();
  const base = () => `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const signup = await fetch(base() + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Owner', email: 'owner@example.test', password: 'Password123!', role: 'customer', contact: '+7 fictional' }) });
    assert.equal(signup.status, 200);
    const session = await signup.json();
    const cookie = signup.headers.get('set-cookie')!.split(';')[0];
    const created = await fetch(base() + '/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': session.csrfToken }, body: JSON.stringify({ category: 'Laptop', brand: 'Lenovo', model: 'T14', fault: 'Battery', city: 'Almaty' }) });
    assert.equal(created.status, 200);
    await new Promise<void>(resolve => server.close(() => resolve()));
    await backend.close();
    backend = await createApp({ repository: await PostgresRepository.open(h.url, h.schema) });
    server = await start();
    const restored = await (await fetch(base() + '/api/session', { headers: { Cookie: cookie } })).json();
    assert.equal(restored.me.email, 'owner@example.test');
    assert.equal(restored.requests[0].fault, 'Battery');
    assert.equal(restored.csrfToken, session.csrfToken);
    assert.deepEqual(await (await fetch(base() + '/api/health')).json(), { status: 'ok', storage: 'postgres' });
    // A lost writer connection must not serve stale cached state as healthy.
    await backend.repository.close();
    assert.equal((await fetch(base() + '/api/health')).status, 503);
    assert.equal((await fetch(base() + '/api/session', { headers: { Cookie: cookie } })).status, 503);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await backend.close(); await h.cleanup(); }
});

test('two simultaneous HTTP instances share PostgreSQL without losing registrations', async () => {
  const h = await isolatedPostgres();
  const other = await PostgresRepository.open(h.url, h.schema);
  const first = await createApp({ repository: h.repository });
  const second = await createApp({ repository: other });
  const listen = (app: typeof first.app) => new Promise<Server>(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
  const firstServer = await listen(first.app);
  const secondServer = await listen(second.app);
  const origin = (server: Server) => `http://127.0.0.1:${(server.address() as {port: number}).port}`;
  const register = (server: Server, email: string) => fetch(origin(server) + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: email, email, password: 'ValidPassword123!',
      role: 'customer', contact: '+7 fictional',
    }),
  });
  try {
    const [a, b] = await Promise.all([
      register(firstServer, 'first@example.test'),
      register(secondServer, 'second@example.test'),
    ]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    const state = (await h.repository.withExclusive(() => h.repository.load()))!;
    assert.deepEqual(state.accounts.map(account => account.email).sort(), [
      'first@example.test', 'second@example.test',
    ]);
    // Sessions created on either instance are valid on the other instance.
    const firstCookie = a.headers.get('set-cookie')!.split(';')[0];
    const secondCookie = b.headers.get('set-cookie')!.split(';')[0];
    const firstOnSecond = await (await fetch(origin(secondServer) + '/api/session', {
      headers: { Cookie: firstCookie },
    })).json();
    const secondOnFirst = await (await fetch(origin(firstServer) + '/api/session', {
      headers: { Cookie: secondCookie },
    })).json();
    assert.equal(firstOnSecond.me.email, 'first@example.test');
    assert.equal(secondOnFirst.me.email, 'second@example.test');
  } finally {
    await Promise.all([firstServer, secondServer].map(server =>
      new Promise<void>(resolve => server.close(() => resolve())),
    ));
    await first.close();
    await second.close();
    await h.cleanup();
  }
});
