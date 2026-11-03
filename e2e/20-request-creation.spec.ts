import { test, expect, identity, seedAccount, signInUI, api } from './helpers';

test('issue 20: customer creates a request using the real browser form', async ({ browser, page, context }, info) => {
  const account = identity(info, 'customer');
  await seedAccount(browser, account);
  expect((await signInUI(page, account)).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Repair requests', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No requests yet', exact: true })).toBeVisible();

  const uniqueModel = `E2E-${info.workerIndex}-${Date.now()}`;
  await page.getByRole('button', { name: '+ New request' }).click();
  await expect(page.getByRole('heading', { name: 'Describe your device' })).toBeVisible();
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Laptop' });
  await page.getByLabel('City', { exact: true }).fill('Almaty');
  await page.getByLabel('Brand', { exact: true }).fill('E2EBrand');
  await page.getByLabel('Model', { exact: true }).fill(uniqueModel);
  await page.getByLabel('What is wrong?', { exact: true }).fill('Screen flickers when the lid opens.');
  const submitted = page.waitForResponse(response =>
    response.url().endsWith('/api/requests') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  expect((await submitted).status()).toBe(200);
  const card = page.getByRole('navigation', { name: 'Repair requests' }).getByRole('button').filter({ hasText: uniqueModel });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.locator('.detail-heading')).toContainText(uniqueModel);
  await expect(page.locator('.fault')).toContainText('Screen flickers when the lid opens.');

  const session = await (await api(context, 'GET', '/api/session')).json();
  expect(session.requests.some((request: { model: string; city: string; brand: string }) =>
    request.model === uniqueModel && request.city === 'Almaty' && request.brand === 'E2EBrand')).toBe(true);
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Repair requests' }).getByRole('button').filter({ hasText: uniqueModel })).toBeVisible();
});

test('issue 20: empty required fields are blocked by browser validation', async ({ browser, page }, info) => {
  const account = identity(info, 'customer');
  await seedAccount(browser, account);
  expect((await signInUI(page, account)).status()).toBe(200);
  await page.getByRole('button', { name: '+ New request' }).click();
  let posts = 0;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/requests')) posts++; });
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  expect(await page.getByLabel('City', { exact: true }).evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  expect(posts).toBe(0);
});

test('issue 20: invalid category and workshop ownership are rejected by actual API', async ({ browser }, info) => {
  const customer = identity(info, 'customer', 'invalid-category');
  const workshop = identity(info, 'workshop', 'not-owner');
  const customerContext = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' });
  const workshopContext = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' });
  try {
    expect((await api(customerContext, 'POST', '/api/auth/register', customer)).status()).toBe(200);
    const body = { category: 'Unsupported device', brand: 'E2E', model: 'Bad category', fault: 'Broken', city: 'Almaty', photos: [] };
    expect((await api(customerContext, 'POST', '/api/requests', body)).status()).toBe(422);
    expect((await api(workshopContext, 'POST', '/api/auth/register', workshop)).status()).toBe(200);
    const denied = await api(workshopContext, 'POST', '/api/requests', { ...body, category: 'Laptop' });
    expect(denied.status()).toBe(403);
  } finally {
    await customerContext.close();
    await workshopContext.close();
  }
});
