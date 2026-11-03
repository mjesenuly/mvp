import { test, expect, identity, api, signInUI, baseURL } from './helpers';

test('issue 19: admin approves a pending workshop using browser, workshop then enters workspace', async ({ browser }, info) => {
  const workshop = identity(info, 'workshop');
  const pendingContext = await browser.newContext({ baseURL });
  const adminContext = await browser.newContext({ baseURL });
  const strangerContext = await browser.newContext({ baseURL });
  try {
    const registered = await api(pendingContext, 'POST', '/api/auth/register', workshop);
    expect(registered.status()).toBe(200);
    const pendingUser = (await registered.json()).me as { id: string; approved: boolean };
    expect(pendingUser.approved).toBe(false);
    const pendingPage = await pendingContext.newPage();
    await pendingPage.goto('/');
    await expect(pendingPage.getByRole('heading', { name: 'Approval is pending.' })).toBeVisible();
    await expect(pendingPage.getByRole('heading', { name: 'Find your next repair' })).toHaveCount(0);

    // Only the disposable test account specified in .env.test; never production.
    const adminEmail = 'admin@example.test';
    const adminPassword = 'AdminPass123!';
    const adminPage = await adminContext.newPage();
    expect((await signInUI(adminPage, { email: adminEmail, password: adminPassword })).status()).toBe(200);
    await expect(adminPage.getByRole('heading', { name: 'Workshop approvals' })).toBeVisible();
    const row = adminPage.locator('article').filter({ has: adminPage.getByRole('heading', { name: workshop.name, exact: true }) });
    const response = adminPage.waitForResponse(r =>
      r.url().includes(`/api/admin/workshops/${pendingUser.id}/approve`) && r.request().method() === 'POST');
    await row.getByRole('button', { name: 'Approve workshop' }).click();
    expect((await response).status()).toBe(200);
    await expect(row).toContainText('Approved');

    await pendingPage.getByRole('button', { name: 'Check approval status' }).click();
    await expect(pendingPage.getByRole('heading', { name: 'Find your next repair' })).toBeVisible();

    const outsider = identity(info, 'customer', 'cannot-approve');
    expect((await api(strangerContext, 'POST', '/api/auth/register', outsider)).status()).toBe(200);
    expect((await api(strangerContext, 'POST', `/api/admin/workshops/${pendingUser.id}/approve`, {})).status()).toBe(403);
  } finally {
    await pendingContext.close();
    await adminContext.close();
    await strangerContext.close();
  }
});
