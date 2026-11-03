import { test, expect, identity, api, signInUI } from './helpers';

test('issue 21: another customer cannot browse the first customer\'s repair request', async ({ browser }, info) => {
  const first = identity(info, 'customer', 'owner');
  const second = identity(info, 'customer', 'outsider');
  const owner = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' });
  const outsider = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' });
  try {
    expect((await api(owner, 'POST', '/api/auth/register', first)).status()).toBe(200);
    expect((await api(outsider, 'POST', '/api/auth/register', second)).status()).toBe(200);
    const model = `Private-${Date.now()}-${info.workerIndex}`;
    const created = await api(owner, 'POST', '/api/requests', {
      category: 'Laptop', brand: 'E2E', model, fault: 'Private customer repair', city: 'Almaty', photos: [],
    });
    expect(created.status()).toBe(200);
    const requestId = (await created.json()).requests.find((r: { model: string }) => r.model === model).id as string;
    const ownerPage = await owner.newPage();
    await ownerPage.goto('/');
    await expect(ownerPage.getByRole('navigation', { name: 'Repair requests' }).getByRole('button').filter({ hasText: model })).toBeVisible();
    const outsiderPage = await outsider.newPage();
    await outsiderPage.goto('/');
    await expect(outsiderPage.getByRole('heading', { name: 'No requests yet' })).toBeVisible();
    await expect(outsiderPage.getByText(model)).toHaveCount(0);
    expect((await (await api(outsider, 'GET', '/api/requests')).json()).requests).toEqual([]);
    const forbidden = await api(outsider, 'POST', `/api/requests/${requestId}/cancel`, {});
    expect(forbidden.status()).toBe(404); // Non-owners receive a non-disclosing not-found response.
  } finally {
    await owner.close();
    await outsider.close();
  }
});
