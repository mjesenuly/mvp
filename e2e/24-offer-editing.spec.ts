import { test, expect, api } from './helpers';
import { journey, detail, quote, standardTerms } from './journey';
test('issue 24: workshop edits its offer in the browser before acceptance', async ({ browser }, info) => {
  const j = await journey(browser, info, 'offer');
  try {
    const page = await detail(j.workshop, j.model);
    await page.getByRole('button', { name: 'Edit your offer' }).click();
    const form = await quote(page, 'New repair scope for updated quote');
    const response = page.waitForResponse(r => r.url().endsWith('/offers') && r.request().method() === 'POST');
    await form.getByRole('button', { name: 'Save offer' }).click();
    expect((await response).status()).toBe(200);
    await expect(page.getByRole('table')).toContainText('New repair scope');
    const view = await (await api(j.owner, 'GET', '/api/session')).json();
    expect(view.offers.filter((o: { requestId: string; withdrawn: boolean }) => o.requestId === j.requestId && !o.withdrawn)).toHaveLength(1);
  } finally { await j.close(); }
});