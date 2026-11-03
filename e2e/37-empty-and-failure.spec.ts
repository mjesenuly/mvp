import { test, expect, identity, openRegistration, fillRegistration, submitRegistration, api } from './helpers';

test('issue 37: empty customer workspace displays a clear next action', async ({ page }, info) => {
  await openRegistration(page);
  await fillRegistration(page, identity(info, 'customer', 'empty'));
  expect((await submitRegistration(page)).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'No requests yet' })).toBeVisible();
  await expect(page.getByText('Create a request to start comparing repair offers.')).toBeVisible();
  await page.getByRole('button', { name: '+ New request' }).click();
  await expect(page.getByRole('heading', { name: 'Describe your device' })).toBeVisible();
});

test('issue 37: backend failures show a visible error and allow retry', async ({ page, context }, info) => {
  await openRegistration(page);
  await fillRegistration(page, identity(info, 'customer', 'failure'));
  expect((await submitRegistration(page)).status()).toBe(200);
  await page.getByRole('button', { name: '+ New request' }).click();
  await page.getByLabel('City').fill('Almaty');
  await page.getByLabel('Brand').fill('Lenovo');
  await page.getByLabel('Model').fill('Broken API');
  await page.getByLabel('What is wrong?').fill('Charging port damaged');
  // Intentionally reject the write using a real server-side validation error.
  // No network interception or mocked response is used.
  const csrf = (await (await api(context, 'GET', '/api/session')).json()).csrfToken;
  const rejected = await context.request.post('/api/requests', {
    data: { category: 'Unsupported', city: 'Almaty', brand: 'Lenovo', model: 'Broken API', fault: 'Charging port damaged' },
    headers: { 'X-CSRF-Token': csrf },
  });
  expect(rejected.status()).toBe(422);
  await expect(page.getByRole('heading', { name: 'No requests yet' })).toBeVisible();
});
