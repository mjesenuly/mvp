import { test, expect, identity, seedAccount, signInUI, api } from './helpers';

test('issue 18: signing out clears the UI session and reload stays signed out', async ({ browser, page, context }, info) => {
  const account = identity(info, 'customer');
  await seedAccount(browser, account);
  expect((await signInUI(page, account)).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Repair requests', exact: true })).toBeVisible();

  const previousCookies = await context.cookies();
  const previousSession = previousCookies.find(cookie => cookie.name === 'repairlens_session');
  expect(previousSession?.httpOnly).toBe(true);
  const logoutResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/auth/logout') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  expect((await logoutResponse).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
  expect((await (await api(context, 'GET', '/api/session')).json()).me).toBeNull();
  expect((await api(context, 'GET', '/api/requests')).status()).toBe(401);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
  expect((await (await api(context, 'GET', '/api/session')).json()).me).toBeNull();

  // A stolen/replayed cookie must not recover the invalidated server-side session.
  const replay = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' });
  try {
    await replay.addCookies([previousSession!]);
    expect((await replay.request.get('/api/requests')).status()).toBe(401);
  } finally {
    await replay.close();
  }
});
