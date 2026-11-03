import { test, expect, api } from './helpers';
import { journey, detail } from './journey';
test('issue 25: workshop withdraws offer and owner cannot choose it', async ({ browser }, info) => {
  const j = await journey(browser, info, 'offer');
  try {
    const page = await detail(j.workshop, j.model);
    const response = page.waitForResponse(r => r.url().endsWith('/offers/mine') && r.request().method() === 'DELETE');
    await page.getByRole('button', { name: 'Withdraw offer' }).click();
    expect((await response).status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Withdraw offer' })).toHaveCount(0);
    const ownerPage = await detail(j.owner, j.model);
    await expect(ownerPage.getByRole('button', { name: 'Choose offer' })).toHaveCount(0);
    expect((await api(j.owner, 'POST', `/api/requests/${j.requestId}/select`, { offerId: j.offerId })).status()).toBe(404);
  } finally { await j.close(); }
});