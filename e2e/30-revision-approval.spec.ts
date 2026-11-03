import { test, expect } from './helpers';
import { prepareJourney, currentRepair } from './journey';
test('issue 30: customer approves revised terms before repair can start', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'revised');
 try {
  const page=await j.customer.newPage();await page.goto('/');
  await expect(page.getByRole('heading',{name:'New terms need your approval'})).toBeVisible();
  await page.getByRole('button',{name:'Accept revised terms'}).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  const state=await currentRepair(j.customer,j.requestId);
  expect(state.repair.pending).toBeUndefined();
  expect(state.repair.accepted.scope).toBe('Revised port replacement');
  expect(state.repair.status).toBe('accepted');
 }finally{await j.close();}
});