import { test, expect, identity, seedAccount, signInUI, api } from './helpers';

test('issue 18: signing out revokes the real browser session and private access', async ({ browser, page, context }, info) => {
  const account = identity(info, 'customer');
  await seedAccount(browser, account);
  expect((await signInUI(page, account)).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Repair requests', exact: true })).toBeVisible();

  const before = await (await api(context, 'GET', '/api/session')).json();
  expect(before.me).toMatchObject({ email: account.email, role: 'customer' });

  const logoutResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/auth/logout') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: /^(sign out|log out|logout)$/i }).click();
  expect((await logoutResponse).status()).toBe(200);

  await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
  expect((await (await api(context, 'GET', '/api/session')).json()).me).toBeNull();
  expect((await api(context, 'GET', '/api/requests')).status()).toBe(401);
  expect((await context.cookies()).some(cookie => cookie.name === 'repairlens_session')).toBe(false);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Repair requests', exact: true })).toHaveCount(0);
});

test('issue 18: signing out does not delete the registered account', async ({ browser, page, context }, info) => {
  const account = identity(info, 'customer');
  const seeded = await seedAccount(browser, account);
  expect((await signInUI(page, account)).status()).toBe(200);
  const logoutResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/auth/logout') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: /^(sign out|log out|logout)$/i }).click();
  expect((await logoutResponse).status()).toBe(200);
  expect((await signInUI(page, account)).status()).toBe(200);
  const restored = await (await api(context, 'GET', '/api/session')).json();
  expect(restored.me).toMatchObject({ id: seeded.id, email: account.email });
});
