import { test, expect } from './helpers';
import { prepareJourney } from './journey';
test('issue 27: customer sees itemised quote, scope, warranty and exclusions', async ({ browser }, info) => {
 const j=await prepareJourney(browser,info,'offer');
 try {
  const page=await j.customer.newPage();await page.goto('/');
  await expect(page.getByRole('heading',{name:'Compare repair offers'})).toBeVisible();
  await expect(page.getByText('Replace charging port')).toBeVisible();
  await expect(page.getByText('90 days')).toBeVisible();
  await expect(page.getByText('Water damage')).toBeVisible();
  await expect(page.getByRole('button',{name:'Choose offer'})).toBeVisible();
 }finally{await j.close();}
});