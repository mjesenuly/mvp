import { test, expect, api } from './helpers';
import { journey, detail, standardTerms } from './journey';
test('issue 26: customer compares known, unknown and optional quote costs', async ({ browser }, info) => {
  const j = await journey(browser, info, 'offer');
  const rival = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' });
  try {
    const other = { name: `Competing workshop ${info.workerIndex}`, email: `rival-${Date.now()}-${info.workerIndex}@example.test`, password: 'BrowserFixturePass123!', role: 'workshop', contact: '+7 700 999 9999' };
    const registered = await api(rival, 'POST', '/api/auth/register', other);
    expect(registered.status()).toBe(200);
    const id = (await registered.json()).me.id;
    expect((await api(j.admin, 'POST', `/api/admin/workshops/${id}/approve`, {})).status()).toBe(200);
    const alternative = { ...standardTerms, kind: 'estimated', scope: 'Estimate with unknown parts', fees: { labour: 900000, parts: null, diagnostics: 0, optional: 250000 } };
    expect((await api(rival, 'POST', `/api/requests/${j.requestId}/offers`, { terms: alternative })).status()).toBe(200);
    const page = await detail(j.owner, j.model);
    const table = page.getByRole('table');
    await expect(table).toContainText(j.shop.name);
    await expect(table).toContainText(other.name);
    await expect(table).toContainText('Unknown');
    await expect(table).toContainText('Optional (separate)');
    await expect(table).toContainText('Known subtotal');
    await expect(page.getByText('Best offer', { exact: true })).toHaveCount(0);
  } finally { await rival.close(); await j.close(); }
});