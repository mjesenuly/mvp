import { test, expect, identity, openRegistration, fillRegistration, submitRegistration, api, baseURL } from './helpers';

test('issue 21: an unapproved workshop is blocked until the administrator approves it', async ({ page, browser, context }, info) => {
  const workshop = identity(info, 'workshop');
  await openRegistration(page);
  await fillRegistration(page, workshop);
  expect((await submitRegistration(page)).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Approval is pending.', exact: true })).toBeVisible();

  const pending = await (await api(context, 'GET', '/api/session')).json();
  expect(pending.me).toMatchObject({ role: 'workshop', approved: false });
  expect((await api(context, 'POST', '/api/requests', { category: 'Laptop', brand: 'Dell', model: 'XPS', fault: 'No power', city: 'Almaty' })).status()).toBe(403);

  const admin = await browser.newContext({ baseURL });
  try {
    const login = await api(admin, 'POST', '/api/auth/login', {
      email: process.env.ADMIN_EMAIL ?? 'admin@example.test',
      password: process.env.ADMIN_PASSWORD ?? 'AdminPass123!',
    });
    expect(login.status()).toBe(200);
    const adminSession = await (await api(admin, 'GET', '/api/session')).json();
    expect(adminSession.me.role).toBe('admin');
    expect(adminSession.users.some((user: { id: string }) => user.id === pending.me.id)).toBe(true);

    const approval = await api(admin, 'POST', `/api/admin/workshops/${pending.me.id}/approve`, {});
    expect(approval.status()).toBe(200);
    const approved = await (await api(context, 'GET', '/api/session')).json();
    expect(approved.me).toMatchObject({ id: pending.me.id, role: 'workshop', approved: true });

    await page.getByRole('button', { name: 'Check approval status', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Find your next repair', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Find your next repair', exact: true })).toBeVisible();
  } finally {
    await admin.close();
  }
});
