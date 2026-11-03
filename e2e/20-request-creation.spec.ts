import { test, expect, identity, openRegistration, fillRegistration, submitRegistration, api } from './helpers';

test('issue 20: customer creates a repair request through the real UI and it persists after refresh', async ({ page, context }, info) => {
  const account = identity(info, 'customer');
  await openRegistration(page);
  await fillRegistration(page, account);
  expect((await submitRegistration(page)).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Repair requests', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '+ New request', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Describe your device', exact: true })).toBeVisible();
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Submit request' }) });
  await form.getByLabel('Category').selectOption({ label: 'Laptop' });
  await form.getByLabel('City').fill('Almaty');
  await form.getByLabel('Brand').fill('Lenovo');
  await form.getByLabel('Model').fill('ThinkPad E14');
  await form.getByLabel('What is wrong?').fill('The laptop does not charge after a power outage.');
  const created = page.waitForResponse(response => response.url().endsWith('/api/requests') && response.request().method() === 'POST');
  await form.getByRole('button', { name: 'Submit request' }).click();
  expect((await created).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Lenovo ThinkPad E14', exact: true })).toBeVisible();
  await expect(page.getByText('The laptop does not charge after a power outage.')).toBeVisible();

  const before = await (await api(context, 'GET', '/api/requests')).json();
  const request = before.requests.find((r: { brand: string; model: string }) => r.brand === 'Lenovo' && r.model === 'ThinkPad E14');
  expect(request).toMatchObject({ category: 'Laptop', city: 'Almaty', status: 'open' });
  expect(request.photos).toEqual([]);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Lenovo ThinkPad E14', exact: true })).toBeVisible();
  const after = await (await api(context, 'GET', '/api/requests')).json();
  expect(after.requests.find((r: { id: string }) => r.id === request.id)).toMatchObject({ id: request.id, status: 'open' });
});

test('issue 20: required repair fields prevent empty submission', async ({ page }, info) => {
  await openRegistration(page);
  await fillRegistration(page, identity(info, 'customer'));
  expect((await submitRegistration(page)).status()).toBe(200);
  await page.getByRole('button', { name: '+ New request', exact: true }).click();
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Submit request' }) });
  let writes = 0;
  page.on('request', req => { if (req.url().endsWith('/api/requests') && req.method() === 'POST') writes++; });
  await form.getByRole('button', { name: 'Submit request' }).click();
  expect(await form.getByLabel('City').evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  expect(writes).toBe(0);
  await expect(page.getByRole('heading', { name: 'No requests yet', exact: true })).toBeVisible();
});
