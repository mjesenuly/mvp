// @vitest-environment node
import { it, expect } from 'vitest';
import { createApp } from '../../backend/server';
import { SqliteRepository } from '../../backend/sqlite';
import { ApiService } from './api-service';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';

it('uses the real frontend adapter for a persisted all-role repair journey', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'repairlens-ui-adapter-'));
  const filename = join(folder, 'app.sqlite');
  let backend = await createApp({ repository: await SqliteRepository.open(filename), adminEmail: 'admin@example.test', adminPassword: 'AdminPass123!' });
  let server: Server;
  let base = '';
  async function start() {
    server = await new Promise<Server>(resolve => { const s = backend.app.listen(0, '127.0.0.1', () => resolve(s)); });
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  }
  async function stop() { await new Promise<void>(resolve => server.close(() => resolve())); await backend.close(); }
  function client() {
    let cookie = '';
    return new ApiService(async (url, options) => {
      const headers = new Headers(options?.headers);
      if (cookie) headers.set('Cookie', cookie);
      const response = await fetch(base + String(url), { ...options, headers });
      const set = response.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      return response;
    });
  }
  await start();
  try {
    const customer = client(), workshop = client(), admin = client(), competitor = client();
    const signup = (service: ApiService, name: string, role: string) => service.act('register', { name, email: `${name}@example.test`, password: 'Password123!', role, contact: 'Fictional demo contact' });
    await signup(customer, 'customer', 'customer');
    const pending = await signup(workshop, 'workshop', 'workshop');
    expect(pending.me?.approved).toBe(false);
    const competition = await signup(competitor, 'competitor', 'workshop');
    await admin.act('login', { email: 'admin@example.test', password: 'AdminPass123!' });
    await admin.act('approve', { id: pending.me!.id });
    await admin.act('approve', { id: competition.me!.id });
    const created = await customer.act('request', { category: 'Laptop', brand: 'Demo', model: 'Laptop', fault: 'Battery failure', city: 'Almaty', photos: [{ id: 'local', name: 'fault.png', url: 'data:image/png;base64,iVBORw0KGgoA' }] });
    const id = created.requests[0].id;
    expect(created.requests[0].photos[0].url).toMatch(/^\/api\/photos\//);
    const terms = { kind: 'estimated', fees: { labour: 10000, parts: null, diagnostics: 0, optional: 0 }, scope: 'Replace battery', days: 2, warranty: '90 days', exclusions: 'Water damage' };
    let quoted = await workshop.act('offer', { id, terms });
    await workshop.act('offer', { id, terms: { ...terms, days: 3 } });
    await workshop.act('withdraw', { id });
    quoted = await workshop.act('offer', { id, terms });
    expect((await competitor.load()).offers).toHaveLength(0);
    const offerId = quoted.offers.find(o => !o.withdrawn)!.id;
    await customer.act('select', { id, offerId });
    await expect(customer.act('select', { id, offerId })).rejects.toMatchObject({ status: 409 });
    await workshop.act('revise', { id, terms: { ...terms, days: 4 } });
    await expect(workshop.act('start', { id })).rejects.toMatchObject({ status: 409 });
    await customer.act('acceptRevision', { id });
    await workshop.act('start', { id });
    await workshop.act('ready', { id });
    expect((await customer.act('complete', { id })).requests[0].status).toBe('completed');
    await stop();
    backend = await createApp({ repository: await SqliteRepository.open(filename) });
    await start();
    const restored = await customer.load();
    expect(restored.me?.name).toBe('customer');
    expect(restored.requests[0].status).toBe('completed');
    expect(restored.requests[0].accepted?.days).toBe(4);
    expect((await competitor.load()).requests[0].accepted).toBeUndefined();
  } finally { await stop(); await rm(folder, { recursive: true, force: true }); }
}, 20000);
