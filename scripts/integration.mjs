import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// HTTP integration against an already-running built app. This script never
// imports createApp or the domain engine, starts an in-memory API, or mocks it.
const base = (process.env.BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const phase = process.argv[2] ?? 'journey';
const fixtureFile = path.resolve(process.env.INTEGRATION_STATE_FILE ?? '.integration-state.json');
const expectedStorage = process.env.INTEGRATION_EXPECT_STORAGE ?? 'postgres';

function client(saved = {}) {
  let cookie = saved.cookie ?? '', csrf = saved.csrf ?? '';
  return {
    state: () => ({ cookie, csrf }),
    async call(method, route, body, overrides = {}) {
      const response = await fetch(base + route, {
        method, signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...overrides },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
      if (data.csrfToken !== undefined) csrf = data.csrfToken;
      return { status: response.status, data, headers: response.headers };
    },
  };
}
async function expectStatus(actor, method, route, body, status, headers) {
  const result = await actor.call(method, route, body, headers);
  assert.equal(result.status, status, `${method} ${route}: ${JSON.stringify(result.data).slice(0, 200)}`);
  return result.data;
}
const quote = { kind: 'estimated', fees: { labour: 100000, parts: null, diagnostics: 0, optional: 50000 },
  scope: 'Replace battery', days: 2, warranty: '90 days', exclusions: 'Liquid damage' };
const health = await fetch(base + '/api/health', { signal: AbortSignal.timeout(10000) });
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), { status: 'ok', storage: expectedStorage });

if (phase === 'journey') {
  const index = await fetch(base + '/');
  assert.equal(index.status, 200);
  const html = await index.text();
  assert.match(html, /RepairLens/);
  const asset = /src="([^"]+\.js)"/.exec(html)?.[1];
  assert.ok(asset, 'Built Vite JavaScript asset must be served');
  assert.equal((await fetch(base + asset)).status, 200);
  assert.equal((await fetch(base + '/requests/refresh-check')).status, 200);
  assert.equal((await client().call('GET', '/api/not-a-route')).status, 404);

  const admin = client(), customer = client(), outsider = client(), workshop = client(), rival = client(), anonymous = client();
  await expectStatus(anonymous, 'GET', '/api/requests', undefined, 401);
  await expectStatus(admin, 'POST', '/api/auth/login', {
    email: process.env.ADMIN_EMAIL ?? 'admin@example.test', password: process.env.ADMIN_PASSWORD ?? 'AdminPass123!',
  }, 200);
  const unique = randomUUID();
  async function register(actor, name, role = 'customer') {
    return expectStatus(actor, 'POST', '/api/auth/register', {
      name, email: `${name.toLowerCase()}-${unique}@example.test`, password: 'IntegrationPass123!', role, contact: '+7 700 123 4567',
    }, 200);
  }
  const owner = await register(customer, 'Owner');
  await register(outsider, 'Outsider');
  const workshopUser = await register(workshop, 'Workshop', 'workshop');
  const rivalUser = await register(rival, 'Rival', 'workshop');
  assert.equal((await expectStatus(workshop, 'GET', '/api/requests', undefined, 200)).requests.length, 0);
  await expectStatus(workshop, 'POST', '/api/requests/not-yet-eligible/offers', { terms: quote }, 403);
  for (const user of [workshopUser.me, rivalUser.me]) await expectStatus(admin, 'POST', `/api/admin/workshops/${user.id}/approve`, {}, 200);

  const image = 'data:image/png;base64,' + Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString('base64');
  const created = await expectStatus(customer, 'POST', '/api/requests', {
    category: 'Laptop', brand: 'Lenovo', model: 'T14', fault: 'Bad battery', city: 'Almaty',
    photos: [{ id: 'client-supplied', name: 'device.png', url: image }],
  }, 200);
  const request = created.requests.find(r => r.ownerId === owner.me.id);
  assert.ok(request);
  const photo = request.photos[0];
  assert.match(photo.url, /^\/api\/photos\//);
  await expectStatus(anonymous, 'GET', photo.url, undefined, 401);
  await expectStatus(outsider, 'GET', photo.url, undefined, 404);
  await expectStatus(workshop, 'GET', photo.url, undefined, 200);
  assert.equal((await expectStatus(outsider, 'GET', '/api/requests', undefined, 200)).requests.length, 0);
  await expectStatus(customer, 'POST', '/api/requests', { category: 'invalid' }, 422);
  await expectStatus(customer, 'POST', '/api/requests', {}, 403, { 'X-CSRF-Token': 'incorrect' });

  const submitted = await expectStatus(workshop, 'POST', `/api/requests/${request.id}/offers`, { terms: quote }, 200);
  const offerId = submitted.offers.find(o => o.requestId === request.id && !o.withdrawn).id;
  assert.equal((await expectStatus(rival, 'GET', '/api/requests', undefined, 200)).offers.length, 0);
  await expectStatus(rival, 'POST', `/api/requests/${request.id}/offers`, { terms: { ...quote, days: 5 } }, 200);
  await expectStatus(outsider, 'POST', `/api/requests/${request.id}/select`, { offerId }, 404);
  const race = await Promise.all([customer.call('POST', `/api/requests/${request.id}/select`, { offerId }), customer.call('POST', `/api/requests/${request.id}/select`, { offerId })]);
  assert.deepEqual(race.map(r => r.status).sort(), [200, 409]);
  await expectStatus(workshop, 'POST', `/api/requests/${request.id}/offers`, { terms: { ...quote, days: 8 } }, 409);
  const chosen = (await expectStatus(customer, 'GET', '/api/requests', undefined, 200)).requests.find(r => r.id === request.id);
  assert.deepEqual(chosen.accepted, quote);
  await expectStatus(workshop, 'POST', `/api/requests/${request.id}/revision`, { terms: { ...quote, days: 4 } }, 200);
  await expectStatus(workshop, 'POST', `/api/requests/${request.id}/start`, {}, 409);
  await expectStatus(customer, 'POST', `/api/requests/${request.id}/accept-revision`, {}, 200);
  await expectStatus(workshop, 'POST', `/api/requests/${request.id}/start`, {}, 200);
  await expectStatus(customer, 'POST', `/api/requests/${request.id}/cancel`, {}, 409);
  await expectStatus(workshop, 'POST', `/api/requests/${request.id}/ready`, {}, 200);
  await expectStatus(workshop, 'POST', `/api/requests/${request.id}/complete`, {}, 403);
  const finished = await expectStatus(customer, 'POST', `/api/requests/${request.id}/complete`, {}, 200);
  const completed = finished.requests.find(r => r.id === request.id);
  assert.equal(completed.status, 'completed');
  assert.ok(completed.history.some(event => event.includes('"days":2')));
  assert.ok(completed.history.some(event => event.includes('"days":4')));
  assert.equal(JSON.stringify(finished).includes('scrypt$'), false);
  await writeFile(fixtureFile, JSON.stringify({ customer: customer.state(), workshop: workshop.state(), ownerId: owner.me.id,
    workshopId: workshopUser.me.id, request: completed, offers: finished.offers.filter(o => o.requestId === request.id), photoUrl: photo.url }), { mode: 0o600 });
  console.log(`PASS: external full-stack journey, ${expectedStorage} health, built assets, ownership, protected photo, approval, concurrent acceptance, revision and completion`);
} else if (phase === 'restart') {
  const saved = JSON.parse(await readFile(fixtureFile, 'utf8'));
  const customer = client(saved.customer), workshop = client(saved.workshop);
  const restored = await expectStatus(customer, 'GET', '/api/session', undefined, 200);
  assert.equal(restored.me.id, saved.ownerId, 'Customer session must survive restart');
  const restoredRequest = restored.requests.find(r => r.id === saved.request.id);
  assert.deepEqual(restoredRequest, saved.request, 'Complete request, accepted terms, photos and history must survive restart');
  assert.deepEqual(restored.offers.filter(o => o.requestId === saved.request.id), saved.offers, 'Competing offers must survive restart');
  const workshopView = await expectStatus(workshop, 'GET', '/api/session', undefined, 200);
  assert.equal(workshopView.me.id, saved.workshopId);
  assert.equal(workshopView.me.approved, true, 'Workshop approval must survive restart');
  await expectStatus(customer, 'GET', saved.photoUrl, undefined, 200);
  await expectStatus(customer, 'POST', `/api/requests/${saved.request.id}/cancel`, {}, 409);
  console.log('PASS: application/database restart preserves accounts, workshop approval, sessions, request, offers, accepted terms, photos and activity history');
} else {
  throw new Error('Expected journey or restart phase.');
}
