import { test, expect, api } from './helpers';
import { journey, detail } from './journey';
test('issue 33: customer alone confirms completed repair', async ({ browser }, info) => {
  const j = await journey(browser, info, 'ready');
  try {
    expect((await api(j.workshop, 'POST', `/api/requests/${j.requestId}/complete`, {})).status()).toBe(403);
    const page = await detail(j.owner, j.model);
    const response = page.waitForResponse(r => r.url().endsWith('/complete') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Confirm receipt and complete' }).click();
    expect((await response).status()).toBe(200);
    await expect(page.locator('.detail-heading .badge')).toHaveText('completed');
    expect((await api(j.owner, 'POST', `/api/requests/${j.requestId}/complete`, {})).status()).toBe(409);
    await page.reload();
    await expect(page.locator('.detail-heading .badge')).toHaveText('completed');
  } finally { await j.close(); }
});