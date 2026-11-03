import { test, expect, api } from './helpers';
import { journey, detail, standardTerms } from './journey';
test('issue 27: customer selects one offer and accepted terms persist', async ({ browser }, info) => {
  const j = await journey(browser, info, 'offer');
  try {
    const page = await detail(j.owner, j.model);
    const response = page.waitForResponse(r => r.url().endsWith('/select') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Choose offer' }).click();
    expect((await response).status()).toBe(200);
    await expect(page.locator('.detail-heading .badge')).toHaveText('accepted');
    await expect(page.locator('section.accepted')).toContainText(standardTerms.scope);
    expect((await api(j.owner, 'POST', `/api/requests/${j.requestId}/select`, { offerId: j.offerId })).status()).toBe(409);
    await page.reload();
    await expect(page.locator('section.accepted')).toContainText(standardTerms.scope);
  } finally { await j.close(); }
});