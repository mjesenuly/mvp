import { test, expect, identity, openRegistration, fillRegistration, submitRegistration, api, baseURL } from './helpers';

test('issue 22: customers cannot read or modify another customer\'s repair request', async ({ browser, page, context }, info) => {
  const owner = identity(info, 'customer', 'owner');
  await openRegistration(page);
  await fillRegistration(page, owner);
  expect((await submitRegistration(page)).status()).toBe(200);
  const create = await api(context, 'POST', '/api/requests', {
    category: 'Laptop', brand: 'Acer', model: 'Swift Private', fault: 'Battery issue', city: 'Almaty',
  });
  expect(create.status()).toBe(200);
  const ownerData = await (await api(context, 'GET', '/api/requests')).json();
  const owned = ownerData.requests.find((request: { model: string }) => request.model === 'Swift Private');
  expect(owned).toBeTruthy();
  expect(owned.ownerId).toBe(ownerData.me.id);

  const outsider = await browser.newContext({ baseURL });
  try {
    const another = identity(info, 'customer', 'outsider');
    expect((await api(outsider, 'POST', '/api/auth/register', another)).status()).toBe(200);
    const outsiderData = await (await api(outsider, 'GET', '/api/requests')).json();
    expect(outsiderData.requests.some((request: { id: string }) => request.id === owned.id)).toBe(false);
    const cancel = await api(outsider, 'POST', `/api/requests/${owned.id}/cancel`, {});
    expect(cancel.status()).toBe(404);
    const stillOwned = await (await api(context, 'GET', '/api/requests')).json();
    expect(stillOwned.requests.find((request: { id: string }) => request.id === owned.id)).toMatchObject({ status: 'open' });
  } finally {
    await outsider.close();
  }

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Acer Swift Private', exact: true })).toBeVisible();
});
