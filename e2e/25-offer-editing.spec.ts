import { test, expect, api } from './helpers';
import { prepareJourney, currentRepair, openJourney } from './journey';
test('issue 25: editing a quote updates the same offer', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'offer');
 try {
  const page=await j.workshop.newPage();await openJourney(page,j);
  await page.getByRole('button',{name:'Edit your offer'}).click();
  await page.getByLabel('Work included').fill('Updated full charging port replacement');
  await page.getByRole('button',{name:'Save offer'}).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  const state=await currentRepair(j.customer,j.requestId);
  expect(state.data.offers).toHaveLength(1);
  expect(state.data.offers[0].id).toBe(j.offerId);
  expect(state.data.offers[0].terms.scope).toBe('Updated full charging port replacement');
 }finally{await j.close();}
});