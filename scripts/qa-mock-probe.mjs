import assert from 'node:assert/strict';
import { MockService, money, subtotal } from '../frontend/src/service.ts';

// Independent QA probe. Run with Node 24: node scripts/qa-mock-probe.mjs
const s = new MockService();
const login = email => s.act('login', { email, password: 'DemoPass123!' });
const terms = { kind: 'estimated', scope: 'Battery replacement', days: 2,
  warranty: '90 days', exclusions: 'None',
  fees: { labour: 123456, parts: 765432, diagnostics: 0, optional: null } };
assert.equal((await s.load()).requests.length, 0);
await assert.rejects(s.act('register', { role: 'admin' }));
await login('workshop@example.test');
const offer = (await s.act('offer', { id: 'sample', terms })).offers[0];
await login('customer@example.test');
const race = await Promise.allSettled([
  s.act('select', { id: 'sample', offerId: offer.id }),
  s.act('select', { id: 'sample', offerId: offer.id }),
]);
assert.equal(race.filter(x => x.status === 'fulfilled').length, 1);
await login('workshop@example.test');
await s.act('revise', { id: 'sample', terms: { ...terms, days: 4 } });
await assert.rejects(s.act('start', { id: 'sample' }));
await s.act('register', { name: 'Competing workshop', email: 'competitor@example.test',
  password: 'DemoPass123!', role: 'workshop', contact: 'fictional' });
const competitorId = s.meId;
assert.equal((await s.load()).requests.length, 0);
await login('admin@example.test');
await s.act('approve', { id: competitorId });
await login('competitor@example.test');
const competitor = await s.load();
assert.equal(competitor.offers.length, 0);
assert.equal(competitor.requests[0].accepted, undefined);
assert.equal(competitor.requests[0].pending, undefined);
assert.ok(!JSON.stringify(competitor).includes('123456'));
assert.ok(!JSON.stringify(competitor).includes('765432'));
await login('workshop@example.test');
assert.equal((await s.load()).requests[0].pending.days, 4);
await login('customer@example.test');
assert.equal((await s.load()).requests[0].accepted.days, 2);
assert.ok((await s.load()).requests[0].history.some(h => h.includes('123456')));
await s.act('acceptRevision', { id: 'sample' });
await login('workshop@example.test');
await s.act('start', { id: 'sample' });
await login('customer@example.test');
await assert.rejects(s.act('cancel', { id: 'sample' }));
await login('workshop@example.test');
await s.act('ready', { id: 'sample' });
await login('customer@example.test');
assert.equal((await s.act('complete', { id: 'sample' })).requests[0].status, 'completed');
assert.equal(money(null), 'Unknown');
assert.notEqual(money(0), 'Unknown');
assert.equal(subtotal({ labour: 100, parts: null, diagnostics: 0, optional: 900 }), 100);
console.log('PASS independent mock privacy, permissions, selection race, revision, lifecycle and money probe');
