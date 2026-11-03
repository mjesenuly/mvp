import { test, expect, identity, seedAccount, signInUI, api } from './helpers';

test('issue 17: valid sign-in opens the same private account after reload', async ({ browser, page, context }, info) => {
  const account = identity(info, 'customer');
  const seeded = await seedAccount(browser, account);
  expect((await (await api(context, 'GET', '/api/session')).json()).me).toBeNull();
  expect((await signInUI(page, account)).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Repair requests', exact: true })).toBeVisible();
  await expect(page.locator('header')).toContainText(account.name);
  const beforeReload = await (await api(context, 'GET', '/api/session')).json();
  expect(beforeReload.me).toMatchObject({ id: seeded.id, email: account.email, role: 'customer' });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Repair requests', exact: true })).toBeVisible();
  await expect(page.locator('header')).toContainText(account.name);
  const afterReload = await (await api(context, 'GET', '/api/session')).json();
  expect(afterReload.me.id).toBe(seeded.id);
  expect(afterReload.csrfToken).toBe(beforeReload.csrfToken);
  expect((await api(context, 'GET', '/api/requests')).status()).toBe(200);
});

test('issue 17: incorrect credentials show the real server error and grant no private access', async ({ browser, page, context }, info) => {
  const account = identity(info, 'customer');
  await seedAccount(browser, account);
  expect((await signInUI(page, { ...account, password: 'IncorrectPassword123!' })).status()).toBe(401);
  await expect(page.getByRole('alert')).toContainText('Invalid email or password.');
  await expect(page.getByRole('heading', { name: 'Repair requests', exact: true })).toHaveCount(0);
  expect((await (await api(context, 'GET', '/api/session')).json()).me).toBeNull();
  expect((await api(context, 'GET', '/api/requests')).status()).toBe(401);
  expect((await context.cookies()).some(cookie => cookie.name === 'repairlens_session')).toBe(false);
});
