import { test, expect } from './helpers';
import { prepareJourney, currentRepair, openJourney } from './journey';
test('issue 33: selected workshop marks in-progress repair ready', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'in_repair');
 try {
  const page=await j.workshop.newPage();await openJourney(page,j);
  await page.getByRole('button',{name:'Mark ready for collection'}).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  const state=await currentRepair(j.customer,j.requestId);
  expect(state.repair.status).toBe('ready');
 }finally{await j.close();}
});