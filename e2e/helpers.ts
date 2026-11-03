import { randomUUID } from 'node:crypto';
import { test as base, expect, type BrowserContext, type Page, type TestInfo } from '@playwright/test';

const runId = (process.env.E2E_RUN_ID ?? randomUUID()).replace(/[^a-z0-9-]/gi, '').slice(0, 40);
export const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export type Identity = { name: string; email: string; password: string; role: 'customer' | 'workshop'; contact: string };

/** Every test checks the real server before touching UI. SQLite is an explicit
 * local diagnostic override only; CI always requires PostgreSQL. */
export const test = base.extend<{ healthyStack: void }>({
  healthyStack: [async ({ request }, use) => {
    const response = await request.get('/api/health');
    expect(response.ok(), 'The existing built application must be healthy').toBeTruthy();
    const expectedStorage = process.env.CI ? 'postgres' : (process.env.E2E_EXPECT_STORAGE ?? 'postgres');
    expect(await response.json()).toEqual({ status: 'ok', storage: expectedStorage });
    await use();
  }, { auto: true }],
});
export { expect };

export function identity(info: TestInfo, role: Identity['role'], suffix = ''): Identity {
  const token = `${runId}-${info.workerIndex}-${info.testId.replace(/[^a-z0-9]/gi, '').slice(-15)}-${suffix || role}`;
  return { name: `E2E ${role} ${token}`, email: `${token}@example.test`, password: 'BrowserFixturePass123!', role, contact: '+7 700 123 4567' };
}

export async function openRegistration(page: Page) {
  await page.goto('/');
  await page.getByRole('heading', { name: 'Welcome back', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create your account', exact: true })).toBeVisible();
}

export async function fillRegistration(page: Page, account: Identity) {
  await page.getByLabel('Full name / workshop name', { exact: true }).fill(account.name);
  await page.getByRole('combobox', { name: 'Account type', exact: true }).selectOption(account.role);
  await page.getByLabel('Phone or contact details', { exact: true }).fill(account.contact);
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
}

export async function submitRegistration(page: Page) {
  const response = page.waitForResponse(r => r.url().endsWith('/api/auth/register') && r.request().method() === 'POST');
  await page.locator('form').getByRole('button', { name: 'Create account', exact: true }).click();
  return response;
}

/** A context-bound real API helper: the browser's HttpOnly cookies are shared,
 * and mutation CSRF tokens come from the actual session endpoint. No stubs. */
export async function api(context: BrowserContext, method: string, route: string, data?: unknown) {
  let csrf = '';
  if (!['GET', 'HEAD'].includes(method) && !route.startsWith('/api/auth/register') && !route.startsWith('/api/auth/login')) {
    const session = await context.request.get('/api/session');
    expect(session.ok()).toBeTruthy();
    csrf = (await session.json()).csrfToken;
  }
  return context.request.fetch(route, { method, data, headers: csrf ? { 'X-CSRF-Token': csrf } : {} });
}
