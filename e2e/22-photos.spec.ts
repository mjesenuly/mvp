import { test, expect, api, identity, baseURL } from './helpers';
import { Buffer } from 'node:buffer';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV5kAAAAASUVORK5CYII=', 'base64');

test('issue 22: uploaded PNG is shown to its owner but is not public', async ({ browser }, info) => {
  const owner = await browser.newContext({ baseURL });
  const stranger = await browser.newContext({ baseURL });
  try {
    const account = identity(info, 'customer', 'photo-owner');
    expect((await api(owner, 'POST', '/api/auth/register', account)).status()).toBe(200);
    const page = await owner.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: '+ New request' }).click();
    const form = page.locator('form:has([name="photos"])');
    await form.locator('[name="category"]').selectOption({ label: 'Laptop' });
    await form.locator('[name="city"]').fill('Almaty');
    await form.locator('[name="brand"]').fill('PhotoTest');
    await form.locator('[name="model"]').fill(`Photo-${Date.now()}`);
    await form.locator('[name="fault"]').fill('Photographed crack');
    await form.locator('[name="photos"]').setInputFiles({
      name: 'repair.png', mimeType: 'image/png', buffer: tinyPng,
    });
    const response = page.waitForResponse(r => r.url().endsWith('/api/requests') && r.request().method() === 'POST');
    await form.getByRole('button', { name: 'Submit request' }).click();
    expect((await response).status()).toBe(200);
    const photo = page.getByRole('img', { name: 'repair.png' });
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    const src = await photo.getAttribute('src');
    expect(src).toMatch(/^\/api\/photos\//);
    expect((await owner.request.get(src!)).status()).toBe(200);
    expect((await stranger.request.get(src!)).status()).toBe(401);
    const strangerAccount = identity(info, 'customer', 'photo-outsider');
    expect((await api(stranger, 'POST', '/api/auth/register', strangerAccount)).status()).toBe(200);
    expect((await stranger.request.get(src!)).status()).toBe(404);
  } finally { await owner.close(); await stranger.close(); }
});

test('issue 22: browser refuses unsupported image type and excessive attachments', async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL });
  try {
    expect((await api(context, 'POST', '/api/auth/register', identity(info, 'customer', 'photo-validation'))).status()).toBe(200);
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: '+ New request' }).click();
    const form = page.locator('form:has([name="photos"])');
    await form.locator('[name="city"]').fill('Almaty');
    await form.locator('[name="brand"]').fill('PhotoTest');
    await form.locator('[name="model"]').fill('Validation');
    await form.locator('[name="fault"]').fill('Invalid attachments');
    let requests = 0;
    page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/requests')) requests++; });
    await form.locator('[name="photos"]').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
    await form.getByRole('button', { name: 'Submit request' }).click();
    await expect(page.getByRole('alert')).toContainText('Use JPEG, PNG or WebP');
    expect(requests).toBe(0);
    await form.locator('[name="photos"]').setInputFiles([1, 2, 3, 4].map(n => ({
      name: `photo-${n}.png`, mimeType: 'image/png', buffer: tinyPng,
    })));
    await form.getByRole('button', { name: 'Submit request' }).click();
    await expect(page.getByRole('alert')).toContainText('no more than three photos');
    expect(requests).toBe(0);
  } finally { await context.close(); }
});
