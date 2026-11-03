import { test, expect } from './helpers';
import { prepareJourney, currentRepair } from './journey';
test('issue 36: repair activity and accepted terms survive a reload', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'ready');
 try {
  const page=await j.customer.newPage();await page.goto('/');
  const history=page.getByText('Activity and previous terms');
  await history.click();
  await expect(page.locator('.history')).toContainText('Request created');
  await expect(page.locator('.history')).toContainText('Offer selected');
  await expect(page.locator('.history')).toContainText('Repair started');
  await expect(page.locator('.history')).toContainText('Ready for customer confirmation');
  const before=await currentRepair(j.customer,j.requestId);
  await page.reload();
  await page.getByText('Activity and previous terms').click();
  const after=await currentRepair(j.customer,j.requestId);
  expect(after.repair.history).toEqual(before.repair.history);
  expect(after.repair.accepted).toEqual(before.repair.accepted);
 }finally{await j.close();}
});