import { test, expect, api } from './helpers';
import { journey, detail, standardTerms } from './journey';
test('issue 28: selected workshop proposes a revision without altering accepted terms', async ({ browser }, info) => {
  const j = await journey(browser, info, 'accepted');
  try {
    const page = await detail(j.workshop, j.model);
    await page.getByRole('button', { name: 'Propose revised terms' }).click();
    await page.locator('form [name="scope"]').fill('Revised scope with more parts');
    const response = page.waitForResponse(r => r.url().endsWith('/revision') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Send revision for approval' }).click();
    expect((await response).status()).toBe(200);
    await expect(page.locator('section.revision')).toContainText('Revised scope with more parts');
    await expect(page.locator('section.accepted')).toContainText(standardTerms.scope);
    await expect(page.getByRole('button', { name: 'Start repair' })).toHaveCount(0);
    expect((await api(j.workshop, 'POST', `/api/requests/${j.requestId}/start`, {})).status()).toBe(409);
  } finally { await j.close(); }
});