import { test, expect, identity, api } from './helpers';

test('issue 35: server-created repair history survives reload and is not client-writable', async ({ browser }, info) => {
  const account = identity(info, 'customer');
  const context = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' });
  try {
    expect((await api(context, 'POST', '/api/auth/register', account)).status()).toBe(200);
    const model = `History-${Date.now()}-${info.workerIndex}`;
    const body = { category: 'Laptop', brand: 'E2E', model, fault: 'Keyboard broken', city: 'Almaty', photos: [] };
    expect((await api(context, 'POST', '/api/requests', body)).status()).toBe(200);
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Repair requests' }).getByRole('button').filter({ hasText: model }).click();
    await page.getByText('Activity and previous terms', { exact: true }).click();
    await expect(page.locator('.history')).toContainText('Request created');
    const historyBefore = await page.locator('.history').innerText();
    const injection = await api(context, 'POST', '/api/requests', { ...body, model: model + '-fake', history: ['Injected event'] });
    expect(injection.status()).toBe(422);
    await page.reload();
    await page.getByText('Activity and previous terms', { exact: true }).click();
    await expect(page.locator('.history')).toHaveText(historyBefore);
    await expect(page.locator('.history')).not.toContainText('Injected event');
  } finally { await context.close(); }
});
