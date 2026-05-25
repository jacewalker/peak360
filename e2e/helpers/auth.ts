import { expect, type Page } from '@playwright/test';

/**
 * Shared e2e auth helper.
 *
 * Signs in as the seeded admin via Better Auth's email/password endpoint
 * using `page.request` so the resulting session cookie lands in the page's
 * browser context (subsequent `page.goto` calls are authenticated).
 *
 * Credentials come from the environment with sensible dev defaults that match
 * the seeded admin in the dev Postgres (admin@admin.com / password123).
 */

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@admin.com';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'password123';

export async function signInAsAdmin(page: Page): Promise<void> {
  const res = await page.request.post('/api/auth/sign-in/email', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(
    res.ok(),
    `sign-in failed: ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
}
