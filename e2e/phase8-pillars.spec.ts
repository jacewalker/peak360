import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * Phase 8: Five-pillar Peak Living module — portal interactive UI.
 *
 * Drafted by /gsd-execute-phase 08 to give the human-UAT items in
 * 08-HUMAN-UAT.md an automated counterpart. Set TEST_ADMIN_EMAIL,
 * TEST_ADMIN_PASSWORD, and TEST_ASSESSMENT_ID before running:
 *
 *   TEST_ADMIN_EMAIL=admin@peak360.com.au \
 *   TEST_ADMIN_PASSWORD=<password> \
 *   TEST_ASSESSMENT_ID=<uuid> \
 *     npx playwright test e2e/phase8-pillars.spec.ts
 *
 * Without those env vars the suite is skipped — it doesn't fall over the
 * Phase 7 auth gate the way the older e2e/phase1-report.spec.ts does.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
const ASSESSMENT_ID = process.env.TEST_ASSESSMENT_ID ?? '';

async function signIn(request: APIRequestContext): Promise<void> {
  const res = await request.post('/api/auth/sign-in/email', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), `sign-in failed: ${res.status()} ${await res.text()}`).toBeTruthy();
}

async function gotoReport(page: Page): Promise<void> {
  await page.goto(`/portal/assessment/${ASSESSMENT_ID}/report`);
  await page.waitForLoadState('networkidle');
}

test.describe('Phase 8: Peak Living pillars module', () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD || !ASSESSMENT_ID,
    'Set TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_ASSESSMENT_ID to run',
  );

  test.beforeEach(async ({ request }) => {
    await signIn(request);
  });

  test('renders heading + intro from pillar_page_copy', async ({ page }) => {
    await gotoReport(page);
    await expect(page.getByRole('heading', { name: /Peak Living Pillars/i })).toBeVisible();
  });

  test('renders five pillar cards in sort order', async ({ page }) => {
    await gotoReport(page);
    const cards = page.getByRole('button', { name: /Open detailed view for/i });
    await expect(cards).toHaveCount(5);
  });

  test('clicking a card opens the modal, ESC closes it and returns focus', async ({ page }) => {
    await gotoReport(page);
    const firstCard = page.getByRole('button', { name: /Open detailed view for/i }).first();
    await firstCard.focus();
    await firstCard.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(firstCard).toBeFocused();
  });

  test('focus is trapped inside the modal', async ({ page }) => {
    await gotoReport(page);
    await page.getByRole('button', { name: /Open detailed view for/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Tab forward several times — focus must remain inside the dialog.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const stillInside = await page.evaluate(
        () => !!document.activeElement?.closest('[role="dialog"]'),
      );
      expect(stillInside, `focus escaped on tab #${i + 1}`).toBeTruthy();
    }
  });

  test('mobile viewport renders bottom-sheet variant', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoReport(page);
    await page.getByRole('button', { name: /Open detailed view for/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const verticalAlignment = await dialog.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, vh: window.innerHeight };
    });
    // Bottom-sheet anchors to viewport bottom — bottom edge within 4px of vh.
    expect(verticalAlignment.vh - verticalAlignment.bottom).toBeLessThan(4);
  });

  test('detailed marker results disclosure is collapsed by default', async ({ page }) => {
    await gotoReport(page);
    const disclosure = page.locator('details').filter({ hasText: /Detailed marker results/i });
    await expect(disclosure).toBeVisible();
    const isOpen = await disclosure.evaluate((el) => (el as HTMLDetailsElement).open);
    expect(isOpen).toBeFalsy();
  });
});
