import { test, expect, identity, seedAccount, signInUI, api } from './helpers';

test('issue 36: clean customer account shows a real empty workspace', async ({ browser, page, context }, info) => {
  const account = identity(info, 'customer');
  await seedAccount(browser, account);
  expect((await signInUI(page, account)).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'No requests yet', exact: true })).toBeVisible();
  await expect(page.getByText('Private workspace · Prices in KZT')).toBeVisible();
  expect((await (await api(context, 'GET', '/api/session')).json()).requests).toEqual([]);
  await expect(page.getByText('Mock preview · Fictional accounts and requests')).toHaveCount(0);
});

test('issue 36: real failed sign-in displays recoverable error', async ({ browser, page }, info) => {
  const account = identity(info, 'customer');
  await seedAccount(browser, account);
  expect((await signInUI(page, { email: account.email, password: 'WrongPassword123!' })).status()).toBe(401);
  await expect(page.getByRole('alert')).toContainText('Invalid email or password.');
  expect((await signInUI(page, account)).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Repair requests', exact: true })).toBeVisible();
});

test('issue 36: explicitly enabled mock preview is labelled, isolated from normal URL', async ({ page }) => {
  await page.goto('/?mode=mock');
  await expect(page.getByText('Mock preview · Fictional accounts and requests')).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('Private workspace · Prices in KZT')).toBeVisible();
  await expect(page.getByText('Mock preview · Fictional accounts and requests')).toHaveCount(0);
});
