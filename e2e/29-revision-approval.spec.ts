import { test, expect, api } from './helpers';
import { journey, detail, revisedTerms } from './journey';
test('issue 29: owner approves revised terms before work can start', async ({ browser }, info) => {
  const j = await journey(browser, info, 'revision');
  try {
    const page = await detail(j.owner, j.model);
    await expect(page.locator('section.revision')).toContainText(revisedTerms.scope);
    const response = page.waitForResponse(r => r.url().endsWith('/accept-revision') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Accept revised terms' }).click();
    expect((await response).status()).toBe(200);
    await expect(page.locator('section.revision')).toHaveCount(0);
    await expect(page.locator('section.accepted')).toContainText(revisedTerms.scope);
    expect((await api(j.workshop, 'POST', `/api/requests/${j.requestId}/start`, {})).status()).toBe(200);
  } finally { await j.close(); }
});