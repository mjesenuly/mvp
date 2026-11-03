import { test, expect } from './helpers';
import { prepareJourney, fixedTerms, currentRepair } from './journey';
test('issue 24: approved workshop submits a quote visible to the customer', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'request');
 try {
  const page=await j.workshop.newPage();await page.goto('/');
  await expect(page.getByRole('heading',{name:'Find your next repair'})).toBeVisible();
  await page.getByRole('button',{name:'Send an offer'}).click();
  await expect(page.getByRole('heading',{name:'Your repair offer'})).toBeVisible();
  const terms=fixedTerms();
  await page.getByLabel('Work included').fill(terms.scope);
  await page.getByLabel('Labour fee').fill('1200');
  await page.getByLabel('Parts fee').fill('3500');
  await page.getByLabel('Diagnostics fee').fill('200');
  await page.getByLabel('Warranty').fill(terms.warranty);
  await page.getByLabel('Exclusions').fill(terms.exclusions);
  await page.getByRole('button',{name:'Save offer'}).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  const state=await currentRepair(j.customer,j.requestId);
  expect(state.data.offers).toHaveLength(1);
  expect(state.data.offers[0].terms.scope).toBe(terms.scope);
 }finally{await j.close();}
});