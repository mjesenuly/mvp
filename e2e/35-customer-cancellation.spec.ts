import { test, expect } from './helpers';
import { prepareJourney, currentRepair } from './journey';
test('issue 35: customer cancels an open request', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'request');
 try {
  const page=await j.customer.newPage();await page.goto('/');
  await page.getByRole('button',{name:'Cancel request'}).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  const state=await currentRepair(j.customer,j.requestId);
  expect(state.repair.status).toBe('cancelled');
  await page.reload();await expect(page.getByRole('button',{name:'Cancel request'})).toHaveCount(0);
 }finally{await j.close();}
});