import { test, expect, api } from './helpers';
import { journey, detail } from './journey';
test('issue 32: workshop marks repair ready for customer confirmation', async ({ browser }, info) => {
  const j = await journey(browser, info, 'in_repair');
  try {
    const page = await detail(j.workshop, j.model);
    const response = page.waitForResponse(r => r.url().endsWith('/ready') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Mark ready for collection' }).click();
    expect((await response).status()).toBe(200);
    await expect(page.locator('.detail-heading .badge')).toHaveText('ready');
    expect((await api(j.workshop, 'POST', `/api/requests/${j.requestId}/ready`, {})).status()).toBe(409);
    const ownerPage = await detail(j.owner, j.model);
    await expect(ownerPage.locator('.detail-heading .badge')).toHaveText('ready');
  } finally { await j.close(); }
});