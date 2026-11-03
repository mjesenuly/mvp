import { test, expect } from './helpers';
import { prepareJourney, currentRepair, fixedTerms, openJourney } from './journey';
test('issue 28: customer chooses an offer and accepted terms stay unchanged', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'offer');
 try {
  const page=await j.customer.newPage();await openJourney(page,j);
  await page.getByRole('button',{name:'Choose offer'}).click();
  await expect(page.getByRole('heading',{name:'Accepted terms'})).toBeVisible();
  const state=await currentRepair(j.customer,j.requestId);
  expect(state.repair.status).toBe('accepted');
  expect(state.repair.accepted).toEqual(fixedTerms());
  expect(state.repair.selectedId).toBe(j.offerId);
  await page.reload();await expect(page.getByRole('heading',{name:'Accepted terms'})).toBeVisible();
 }finally{await j.close();}
});