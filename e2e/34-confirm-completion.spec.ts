import { test, expect } from './helpers';
import { prepareJourney, currentRepair } from './journey';
test('issue 34: customer confirms receipt and completes the repair', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'ready');
 try {
  const page=await j.customer.newPage();await page.goto('/');
  await page.getByRole('button',{name:'Confirm receipt and complete'}).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  const state=await currentRepair(j.customer,j.requestId);
  expect(state.repair.status).toBe('completed');
  await page.reload();await expect(page.getByRole('button',{name:'Confirm receipt and complete'})).toHaveCount(0);
 }finally{await j.close();}
});