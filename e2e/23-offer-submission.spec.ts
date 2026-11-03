import { test, expect, api } from './helpers';
import { journey, detail, quote } from './journey';
test('issue 23: approved workshop submits an offer through browser', async ({ browser }, info) => {
  const j = await journey(browser, info);
  try {
    const page = await detail(j.workshop, j.model);
    await page.getByRole('button', { name: 'Send an offer' }).click();
    const form = await quote(page);
    const response = page.waitForResponse(r => r.url().endsWith('/offers') && r.request().method() === 'POST');
    await form.getByRole('button', { name: 'Save offer' }).click();
    expect((await response).status()).toBe(200);
    await expect(page.locator('table')).toContainText('Replace damaged component');
    const ownerPage = await detail(j.owner, j.model);
    await expect(ownerPage.getByRole('table')).toContainText(j.shop.name);
    const denied = await api(j.owner, 'POST', `/api/requests/${j.requestId}/offers`, { terms: { kind: 'fixed', scope: 'bad' } });
    expect([403, 422]).toContain(denied.status());
  } finally { await j.close(); }
});