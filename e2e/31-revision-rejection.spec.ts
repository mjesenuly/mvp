import { test, expect } from './helpers';
import { prepareJourney, currentRepair, openJourney } from './journey';
test('issue 31: rejecting a revision cancels the request and retains the history', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'revised');
 try {
  const page=await j.customer.newPage();await openJourney(page,j);
  await page.getByRole('button',{name:'Reject and cancel request'}).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  const state=await currentRepair(j.customer,j.requestId);
  expect(state.repair.status).toBe('cancelled');
  expect(state.repair.pending).toBeUndefined();
  expect(state.repair.history.some((line:string)=>line.includes('Revision rejected'))).toBe(true);
 }finally{await j.close();}
});