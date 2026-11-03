import { expect, identity, api, baseURL, type Identity } from './helpers';
import type { Browser, BrowserContext, TestInfo } from '@playwright/test';

export const fixedTerms = (scope = 'Replace charging port', labour = 120000) => ({
  kind: 'fixed' as const,
  fees: { labour, parts: 350000, diagnostics: 20000, optional: 0 },
  scope, days: 3, warranty: '90 days', exclusions: 'Water damage',
});

export type Journey = {
  customer: BrowserContext;
  workshop: BrowserContext;
  admin: BrowserContext;
  customerIdentity: Identity;
  workshopIdentity: Identity;
  requestId: string;
  offerId?: string;
  close: () => Promise<void>;
};

export async function prepareJourney(browser: Browser, info: TestInfo, through: 'request' | 'offer' | 'accepted' | 'revised' | 'in_repair' | 'ready' = 'request'): Promise<Journey> {
  const customer = await browser.newContext({ baseURL });
  const workshop = await browser.newContext({ baseURL });
  const admin = await browser.newContext({ baseURL });
  const close = async () => { await Promise.all([customer.close(), workshop.close(), admin.close()]); };
  try {
    const customerIdentity = identity(info, 'customer', 'journey');
    const workshopIdentity = identity(info, 'workshop', 'journey');
    expect((await api(customer, 'POST', '/api/auth/register', customerIdentity)).status()).toBe(200);
    expect((await api(workshop, 'POST', '/api/auth/register', workshopIdentity)).status()).toBe(200);
    const workshopUser = (await (await api(workshop, 'GET', '/api/session')).json()).me;
    expect((await api(admin, 'POST', '/api/auth/login', {
      email: process.env.ADMIN_EMAIL ?? 'admin@example.test',
      password: process.env.ADMIN_PASSWORD ?? 'AdminPass123!',
    })).status()).toBe(200);
    expect((await api(admin, 'POST', `/api/admin/workshops/${workshopUser.id}/approve`, {})).status()).toBe(200);

    const created = await api(customer, 'POST', '/api/requests', {
      category: 'Laptop', brand: 'Lenovo', model: 'Journey Test', fault: 'No power', city: 'Almaty',
    });
    expect(created.status()).toBe(200);
    const state = await (await api(customer, 'GET', '/api/requests')).json();
    const repair = state.requests.find((r: { model: string }) => r.model === 'Journey Test');
    expect(repair).toBeTruthy();
    const journey: Journey = { customer, workshop, admin, customerIdentity, workshopIdentity, requestId: repair.id, close };
    if (through !== 'request') {
      expect((await api(workshop, 'POST', `/api/requests/${repair.id}/offers`, { terms: fixedTerms() })).status()).toBe(200);
      const offers = (await (await api(customer, 'GET', '/api/requests')).json()).offers;
      journey.offerId = offers.find((o: { requestId: string }) => o.requestId === repair.id).id;
    }
    if (['accepted', 'revised', 'in_repair', 'ready'].includes(through)) {
      expect((await api(customer, 'POST', `/api/requests/${repair.id}/select`, { offerId: journey.offerId })).status()).toBe(200);
    }
    if (through === 'revised') {
      expect((await api(workshop, 'POST', `/api/requests/${repair.id}/revision`, { terms: fixedTerms('Revised port replacement', 160000) })).status()).toBe(200);
    }
    if (['in_repair', 'ready'].includes(through)) {
      expect((await api(workshop, 'POST', `/api/requests/${repair.id}/start`, {})).status()).toBe(200);
    }
    if (through === 'ready') {
      expect((await api(workshop, 'POST', `/api/requests/${repair.id}/ready`, {})).status()).toBe(200);
    }
    return journey;
  } catch (error) { await close(); throw error; }
}

export async function currentRepair(context: BrowserContext, requestId: string) {
  const response = await api(context, 'GET', '/api/requests');
  expect(response.status()).toBe(200);
  const data = await response.json();
  return { data, repair: data.requests.find((r: { id: string }) => r.id === requestId) };
}
