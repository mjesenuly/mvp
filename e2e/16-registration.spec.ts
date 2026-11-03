import { test, expect, identity, openRegistration, fillRegistration, submitRegistration, api, baseURL } from './helpers';

test('issue 16: customer registers through the form and receives a private workspace', async ({ page, context }, info) => {
  const account = identity(info, 'customer');
  await openRegistration(page);
  await fillRegistration(page, account);
  const response = await submitRegistration(page);
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Repair requests', exact: true })).toBeVisible();
  await expect(page.locator('header')).toContainText(account.name);
  const session = await (await api(context, 'GET', '/api/session')).json();
  expect(session.me).toMatchObject({ name: account.name, email: account.email, role: 'customer' });
  expect(session.requests).toEqual([]);
  const cookies = await context.cookies();
  expect(cookies.find(cookie => cookie.name === 'repairlens_session')?.httpOnly).toBe(true);
});

test('issue 16: workshop registration enters pending approval', async ({ page, context }, info) => {
  await openRegistration(page);
  await fillRegistration(page, identity(info, 'workshop'));
  expect((await submitRegistration(page)).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Approval is pending.', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check approval status', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Find your next repair', exact: true })).toHaveCount(0);
  const session = await (await api(context, 'GET', '/api/session')).json();
  expect(session.me).toMatchObject({ role: 'workshop', approved: false });
  expect(session.requests).toEqual([]);
});

test('issue 16: required fields and invalid email/password cannot create an account', async ({ page, context }, info) => {
  await openRegistration(page);
  let registrationRequests = 0;
  page.on('request', request => { if (request.url().endsWith('/api/auth/register') && request.method() === 'POST') registrationRequests++; });
  await page.locator('form').getByRole('button', { name: 'Create account', exact: true }).click();
  expect(await page.getByLabel('Full name / workshop name').evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  await fillRegistration(page, identity(info, 'customer'));
  await page.getByLabel('Email', { exact: true }).fill('not-an-email');
  await page.locator('form').getByRole('button', { name: 'Create account', exact: true }).click();
  expect(await page.getByLabel('Email', { exact: true }).evaluate((input: HTMLInputElement) => input.validity.typeMismatch)).toBe(true);
  await page.getByLabel('Email', { exact: true }).fill(identity(info, 'customer').email);
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.locator('form').getByRole('button', { name: 'Create account', exact: true }).click();
  expect(await page.getByLabel('Password', { exact: true }).evaluate((input: HTMLInputElement) => input.validity.tooShort)).toBe(true);
  expect((await (await api(context, 'GET', '/api/session')).json()).me).toBeNull();
  expect(registrationRequests).toBe(0);
  const invalid = await api(context, 'POST', '/api/auth/register', { ...identity(info, 'customer'), email: 'bad', password: 'short' });
  expect(invalid.status()).toBe(422);
});

test('issue 16: duplicate email shows the real server conflict and does not sign in', async ({ page, context }, info) => {
  const account = identity(info, 'customer', 'duplicate');
  // A separate real session supplies the existing-account prerequisite only.
  const seedContext = await context.browser()!.newContext({ baseURL });
  try {
    expect((await api(seedContext, 'POST', '/api/auth/register', account)).status()).toBe(200);
    await openRegistration(page);
    await fillRegistration(page, account);
    expect((await submitRegistration(page)).status()).toBe(409);
    await expect(page.getByRole('alert')).toContainText('Email already registered.');
    expect((await (await api(context, 'GET', '/api/session')).json()).me).toBeNull();
  } finally { await seedContext.close(); }
});

test('issue 16: public registration never grants the admin role', async ({ page, context }, info) => {
  await openRegistration(page);
  expect(await page.getByRole('combobox', { name: 'Account type', exact: true }).locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).toEqual(['customer', 'workshop']);
  const response = await api(context, 'POST', '/api/auth/register', { ...identity(info, 'customer', 'admin-denied'), role: 'admin' });
  expect(response.status()).toBe(422);
  expect((await (await api(context, 'GET', '/api/session')).json()).me).toBeNull();
  await expect(page.getByRole('heading', { name: 'Workshop approvals', exact: true })).toHaveCount(0);
});
