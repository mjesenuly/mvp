import { type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { api, baseURL, expect, identity } from './helpers';
import type { Terms } from '../frontend/src/service';

export const standardTerms: Terms = {
  kind: 'fixed',
  scope: 'Replace damaged component and test device',
  days: 3,
  warranty: '90 days',
  exclusions: 'Water damage',
  fees: { labour: 1500000, parts: 3500000, diagnostics: 0, optional: 250000 },
};
export const revisedTerms: Terms = {
  ...standardTerms,
  scope: 'Replace damaged component with a new part and retest',
  days: 5,
  fees: { ...standardTerms.fees, parts: 4200000 },
};
export type JourneyStage = 'request' | 'offer' | 'accepted' | 'revision' | 'in_repair' | 'ready';
export async function journey(browser: Browser, info: TestInfo, stage: JourneyStage = 'request') {
  const owner = await browser.newContext({ baseURL });
  const workshop = await browser.newContext({ baseURL });
  const admin = await browser.newContext({ baseURL });
  const customer = identity(info, 'customer', 'journey-owner');
  const shop = identity(info, 'workshop', 'journey-shop');
  const model = `Journey-${Date.now()}-${info.workerIndex}-${info.testId.replace(/[^a-z0-9]/gi, '').slice(-7)}`;
  try {
    expect((await api(owner, 'POST', '/api/auth/register', customer)).status()).toBe(200);
    const registered = await api(workshop, 'POST', '/api/auth/register', shop);
    expect(registered.status()).toBe(200);
    const workshopId = (await registered.json()).me.id as string;
    expect((await api(admin, 'POST', '/api/auth/login', { email: 'admin@example.test', password: 'AdminPass123!' })).status()).toBe(200);
    expect((await api(admin, 'POST', `/api/admin/workshops/${workshopId}/approve`, {})).status()).toBe(200);
    const created = await api(owner, 'POST', '/api/requests', {
      category: 'Laptop', brand: 'Journey', model, fault: 'Keyboard is broken', city: 'Almaty', photos: [],
    });
    expect(created.status()).toBe(200);
    const requestId = (await created.json()).requests.find((r: { model: string }) => r.model === model).id as string;
    let offerId: string | undefined;
    if (stage !== 'request') {
      const response = await api(workshop, 'POST', `/api/requests/${requestId}/offers`, { terms: standardTerms });
      expect(response.status()).toBe(200);
      offerId = (await response.json()).offers.find((o: { requestId: string }) => o.requestId === requestId).id as string;
    }
    if (['accepted', 'revision', 'in_repair', 'ready'].includes(stage)) {
      expect((await api(owner, 'POST', `/api/requests/${requestId}/select`, { offerId })).status()).toBe(200);
    }
    if (stage === 'revision') {
      expect((await api(workshop, 'POST', `/api/requests/${requestId}/revision`, { terms: revisedTerms })).status()).toBe(200);
    }
    if (stage === 'in_repair' || stage === 'ready') {
      expect((await api(workshop, 'POST', `/api/requests/${requestId}/start`, {})).status()).toBe(200);
    }
    if (stage === 'ready') {
      expect((await api(workshop, 'POST', `/api/requests/${requestId}/ready`, {})).status()).toBe(200);
    }
    return {
      owner, workshop, admin, customer, shop, model, requestId, offerId,
      close: async () => { await Promise.all([owner.close(), workshop.close(), admin.close()]); },
    };
  } catch (error) {
    await Promise.all([owner.close(), workshop.close(), admin.close()]);
    throw error;
  }
}
export async function detail(context: BrowserContext, model: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto('/');
  const card = page.getByRole('navigation', { name: 'Repair requests' }).getByRole('button').filter({ hasText: model });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.locator('.detail-heading')).toContainText(model);
  return page;
}
export async function quote(page: Page, scope = standardTerms.scope) {
  const form = page.locator('form').filter({ has: page.locator('[name="scope"]') });
  await form.locator('[name="kind"]').selectOption('fixed');
  await form.locator('[name="scope"]').fill(scope);
  await form.locator('[name="labour"]').fill('15000');
  await form.locator('[name="parts"]').fill('35000');
  await form.locator('[name="diagnostics"]').fill('0');
  await form.locator('[name="optional"]').fill('2500');
  await form.locator('[name="days"]').fill('3');
  await form.locator('[name="warranty"]').fill('90 days');
  await form.locator('[name="exclusions"]').fill('Water damage');
  return form;
}
