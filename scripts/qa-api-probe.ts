import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../backend/server';
import { MemoryRepository, type StateRepository } from '../backend/repository';

export async function qaApiProbe(repository: StateRepository = new MemoryRepository()) {
  let backend = await createApp({ repository, adminEmail: 'qa-admin@example.test', adminPassword: 'AdminPass123!' });
  let server: Server;
  let base = '';
  async function listen() {
    server = await new Promise<Server>(resolve => { const s = backend.app.listen(0, '127.0.0.1', () => resolve(s)); });
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  }
  const close = () => new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  await listen();
  let cookie = '', csrf = '';
  async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie,
      'X-CSRF-Token': csrf, ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const set = r.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const data = await r.json();
    if (data.csrfToken !== undefined) csrf = data.csrfToken;
    return { status: r.status, data, headers: r.headers };
  }
  try {
    const registered = await call('POST', '/api/auth/register', { name: 'QA owner', email: 'qa-owner@example.test',
      password: 'OwnerPass123!', role: 'customer', contact: 'fictional QA contact' });
    assert.equal(registered.status, 200);
    assert.match(registered.headers.get('set-cookie')!, /HttpOnly/);
    assert.match(registered.headers.get('set-cookie')!, /SameSite=Strict/);
    assert.equal(registered.headers.get('cache-control'), 'no-store');
    const body = { category: 'Laptop', brand: 'QA', model: 'Test', fault: 'Battery', city: 'Almaty' };
    const bytes = Buffer.alloc(3 * 1024 * 1024 + 1);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
    const tooLarge = await call('POST', '/api/requests', { ...body,
      photos: [{ id: 'untrusted', name: 'too-large.png', url: 'data:image/png;base64,' + bytes.toString('base64') }] });
    assert.equal(tooLarge.status, 413);
    assert.equal((await call('GET', '/api/requests')).data.requests.length, 0);
    assert.equal((await call('POST', '/api/requests', body, { 'X-CSRF-Token': 'stale' })).status, 403);
    assert.equal((await call('GET', '/api/requests')).data.requests.length, 0);
    assert.equal((await call('POST', '/api/requests', body)).status, 200);
    const stored = (await repository.load())!;
    assert.ok(stored.accounts.every(u => u.password.startsWith('scrypt$')));
    assert.equal(JSON.stringify(stored).includes('OwnerPass123!'), false);
    // Persist an expired session and restart the in-memory adapter deliberately.
    // Later the same probe exercises this against the ORM adapter.
    for (const session of stored.sessions) session.expires = 0;
    await repository.save(stored);
    await close();
    backend = await createApp({ repository });
    await listen();
    assert.equal((await call('GET', '/api/requests')).status, 401);
    const expired = await call('GET', '/api/session');
    assert.equal(expired.data.me, null);
    assert.deepEqual(expired.data.requests, []);
    assert.equal((await call('POST', '/api/auth/login', { email: 'qa-owner@example.test', password: 'wrong' })).status, 401);
    assert.equal((await call('POST', '/api/auth/login', { email: 'qa-owner@example.test', password: 'OwnerPass123!' })).status, 200);
    assert.equal((await call('GET', '/api/requests')).data.requests.length, 1);
    console.log(`PASS independent ${repository.kind} HTTP probe: cookies, no-store, oversized-photo rollback, CSRF, hashed credentials, expiry and sign-in`);
  } finally {
    await close();
    await backend.close();
  }
}

if (process.argv[1]?.endsWith('qa-api-probe.ts')) await qaApiProbe();
