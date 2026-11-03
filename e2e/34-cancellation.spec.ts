import { test, expect, identity, api } from './helpers';

test('issue 34: owner can cancel an open repair, with a persisted history entry', async ({ browser }, info) => {
  const account = identity(info, 'customer');
  const context = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' });
  try {
    expect((await api(context, 'POST', '/api/auth/register', account)).status()).toBe(200);
    const model = `Cancel-${Date.now()}-${info.workerIndex}`;
    const created = await api(context, 'POST', '/api/requests', {
      category: 'Smartphone', brand: 'E2E', model, fault: 'Broken screen', city: 'Almaty', photos: [],
    });
    expect(created.status()).toBe(200);
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Repair requests' }).getByRole('button').filter({ hasText: model }).click();
    await expect(page.locator('.detail-heading .badge')).toHaveText('open');
    const cancelled = page.waitForResponse(r => r.url().includes('/api/requests/') && r.url().endsWith('/cancel') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Cancel request' }).click();
    expect((await cancelled).status()).toBe(200);
    await expect(page.locator('.detail-heading .badge')).toHaveText('cancelled');
    await expect(page.getByRole('button', { name: 'Cancel request' })).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.detail-heading .badge')).toHaveText('cancelled');
    await page.getByText('Activity and previous terms', { exact: true }).click();
    await expect(page.locator('.history')).toContainText('cancel');
  } finally { await context.close(); }
});
