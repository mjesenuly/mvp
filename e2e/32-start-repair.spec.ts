import { test, expect } from './helpers';
import { prepareJourney, currentRepair, openJourney } from './journey';
test('issue 32: selected workshop starts accepted repair', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'accepted');
 try {
  const page=await j.workshop.newPage();await openJourney(page,j);
  await page.getByRole('button',{name:'Start repair'}).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  const state=await currentRepair(j.customer,j.requestId);
  expect(state.repair.status).toBe('in_repair');
  await page.reload();
  await page.locator('.request-card').filter({ hasText: j.model }).click();
  await expect(page.getByRole('button',{name:'Mark ready for collection'})).toBeVisible();
 }finally{await j.close();}
});