import { test, expect, api } from './helpers';
import { journey, detail } from './journey';
test('issue 30: customer rejects revision, terminally cancelling request', async ({ browser }, info) => {
  const j = await journey(browser, info, 'revision');
  try {
    const page = await detail(j.owner, j.model);
    const response = page.waitForResponse(r => r.url().endsWith('/reject-revision') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Reject and cancel request' }).click();
    expect((await response).status()).toBe(200);
    await expect(page.locator('.detail-heading .badge')).toHaveText('cancelled');
    expect((await api(j.workshop, 'POST', `/api/requests/${j.requestId}/start`, {})).status()).toBe(409);
    await page.reload();
    await expect(page.locator('.detail-heading .badge')).toHaveText('cancelled');
  } finally { await j.close(); }
});