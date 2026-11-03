import { test, expect } from './helpers';
import { prepareJourney, currentRepair, fixedTerms, openJourney } from './journey';
test('issue 29: selected workshop proposes a revision that blocks starting work', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'accepted');
 try {
  const page=await j.workshop.newPage();await openJourney(page,j);
  await page.getByRole('button',{name:'Propose revised terms'}).click();
  await expect(page.getByRole('heading',{name:'Propose revised terms'})).toBeVisible();
  await page.getByLabel('Work included').fill('Revised scope with new part');
  await page.getByRole('button',{name:'Send revision for approval'}).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  const state=await currentRepair(j.customer,j.requestId);
  expect(state.repair.pending.scope).toBe('Revised scope with new part');
  expect(state.repair.accepted).toEqual(fixedTerms());
  await expect(page.getByRole('button',{name:'Start repair'})).toHaveCount(0);
 }finally{await j.close();}
});