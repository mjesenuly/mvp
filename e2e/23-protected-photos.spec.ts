import { test, expect, identity, openRegistration, fillRegistration, submitRegistration, api, baseURL } from './helpers';

test('issue 23: uploaded repair photos are private to the request owner', async ({ page, context, browser }, info) => {
  await openRegistration(page);
  await fillRegistration(page, identity(info, 'customer', 'photo-owner'));
  expect((await submitRegistration(page)).status()).toBe(200);

  // Valid 1x1 PNG fixture. The real HTTP endpoint validates the MIME type and file signature.
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const created = await api(context, 'POST', '/api/requests', {
    category: 'Laptop', brand: 'HP', model: 'Photo Protected', fault: 'Damaged screen',
    city: 'Almaty', photos: [{ id: 'client-generated', name: 'damage.png', url: png }],
  });
  expect(created.status()).toBe(200);
  const ownerData = await (await api(context, 'GET', '/api/requests')).json();
  const repair = ownerData.requests.find((r: { model: string }) => r.model === 'Photo Protected');
  expect(repair.photos).toHaveLength(1);
  const photo = repair.photos[0];
  expect(photo.url.startsWith('/api/photos/')).toBe(true);
  expect(photo.url).not.toContain('base64');
  const visible = await api(context, 'GET', photo.url);
  expect(visible.status()).toBe(200);
  expect(visible.headers()['content-type']).toContain('image/png');

  const outsider = await browser.newContext({ baseURL });
  try {
    expect((await api(outsider, 'GET', photo.url)).status()).toBe(401);
    expect((await api(outsider, 'POST', '/api/auth/register', identity(info, 'customer', 'photo-outsider'))).status()).toBe(200);
    expect((await api(outsider, 'GET', photo.url)).status()).toBe(404);
  } finally {
    await outsider.close();
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: 'HP Photo Protected', exact: true })).toBeVisible();
});
