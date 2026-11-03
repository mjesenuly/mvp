import { test, expect } from './helpers';
import { prepareJourney, currentRepair, openJourney } from './journey';
test('issue 26: withdrawn quote disappears from customer comparison', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'offer');
 try {
  const page=await j.workshop.newPage();await openJourney(page,j);
  await page.getByRole('button',{name:'Withdraw offer'}).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  const state=await currentRepair(j.customer,j.requestId);
  expect(state.data.offers).toHaveLength(0);
  await page.reload();
  await expect(page.getByRole('button',{name:'Send an offer'})).toBeVisible();
 }finally{await j.close();}
});