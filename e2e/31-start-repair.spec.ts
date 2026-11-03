import { test, expect, api } from './helpers';
import { journey, detail } from './journey';
test('issue 31: selected workshop starts the accepted repair', async ({ browser }, info) => {
  const j = await journey(browser, info, 'accepted');
  try {
    const page = await detail(j.workshop, j.model);
    const response = page.waitForResponse(r => r.url().endsWith('/start') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Start repair' }).click();
    expect((await response).status()).toBe(200);
    await expect(page.locator('.detail-heading .badge')).toHaveText('in repair');
    expect((await api(j.workshop, 'POST', `/api/requests/${j.requestId}/start`, {})).status()).toBe(409);
    const ownerPage = await detail(j.owner, j.model);
    await expect(ownerPage.locator('.detail-heading .badge')).toHaveText('in repair');
  } finally { await j.close(); }
});