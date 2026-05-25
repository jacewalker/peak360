import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';
import { createAssessment, deleteAssessment } from './helpers/assessment';

/**
 * Mobile / desktop responsiveness for the Phase 9 portal redesign.
 *
 * Routes migrated to /portal/*. The sidebar (src/components/layout/Sidebar.tsx)
 * exposes a fixed hamburger (aria-label "Open navigation") below the lg
 * breakpoint and a persistent desktop rail (aside.hidden.lg:flex) at lg+.
 * The mobile drawer is `aside.w-64` inside a translucent overlay; Escape and
 * an overlay click both close it.
 *
 * Intent preserved from the original spec: no horizontal overflow, adequate
 * touch targets, hamburger opens/closes, desktop layout has no regressions.
 */

async function noHorizontalOverflow(page: import('@playwright/test').Page) {
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = page.viewportSize()!.width;
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
}

function isMobileViewport(page: import('@playwright/test').Page): boolean {
  const vp = page.viewportSize();
  return !!vp && vp.width < 1024;
}

test.describe('Portal responsiveness', () => {
  const createdIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    for (const id of createdIds.splice(0)) {
      await deleteAssessment(page, id);
    }
  });

  test('Dashboard has no horizontal overflow', async ({ page }) => {
    await page.goto('/portal');
    await page.waitForLoadState('domcontentloaded');
    await noHorizontalOverflow(page);
  });

  test('Clients page has no horizontal overflow', async ({ page }) => {
    await page.goto('/portal/clients');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', { name: /clients/i }).first(),
    ).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('Assessments page has no horizontal overflow', async ({ page }) => {
    await page.goto('/portal/assessments');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', { name: /assessments/i }).first(),
    ).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('Section page form inputs have adequate touch targets', async ({
    page,
  }) => {
    const id = await createAssessment(page, { clientName: 'Touch Target' });
    createdIds.push(id);
    await page.goto(`/portal/assessment/${id}/section/1`);
    // The section page is client-rendered (fetches section data then renders
    // the form). Wait for the first form input to appear before measuring.
    const inputs = page.locator(
      'input[type="text"], input[type="email"], input[type="date"], input[type="number"]',
    );
    await expect(inputs.first()).toBeVisible({ timeout: 15000 });
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const box = await input.boundingBox();
        expect(box).toBeTruthy();
        // FormField inputs are h-12 (48px); allow tolerance for rendering.
        expect(box!.height).toBeGreaterThanOrEqual(40);
      }
    }
    await noHorizontalOverflow(page);
  });

  test('Report page has no horizontal overflow', async ({ page }) => {
    const id = await createAssessment(page, { clientName: 'Report Overflow' });
    createdIds.push(id);
    await page.goto(`/portal/assessment/${id}/report`);
    await page.waitForLoadState('domcontentloaded');
    await noHorizontalOverflow(page);
  });
});

test.describe('Mobile sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('Hamburger opens the mobile drawer with nav items', async ({ page }) => {
    test.skip(!isMobileViewport(page), 'Mobile-only test');
    await page.goto('/portal');
    await page.waitForLoadState('domcontentloaded');

    const burger = page.locator('button[aria-label="Open navigation"]');
    await expect(burger).toBeVisible();
    await burger.click();

    const drawer = page.locator('aside.w-64');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Dashboard')).toBeVisible();
    await expect(drawer.getByText('Assessments')).toBeVisible();
    await expect(drawer.getByText('Clients')).toBeVisible();
  });

  test('Escape closes the mobile drawer', async ({ page }) => {
    test.skip(!isMobileViewport(page), 'Mobile-only test');
    await page.goto('/portal');
    await page.waitForLoadState('domcontentloaded');

    const burger = page.locator('button[aria-label="Open navigation"]');
    await burger.click();
    const drawer = page.locator('aside.w-64');
    await expect(drawer).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
});

test.describe('Desktop responsiveness — no regressions', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('Desktop shows persistent sidebar and hides hamburger', async ({
    page,
  }) => {
    test.skip(isMobileViewport(page), 'Desktop-only test');
    await page.goto('/portal');
    await page.waitForLoadState('domcontentloaded');

    const sidebar = page.locator('aside.hidden.lg\\:flex');
    await expect(sidebar).toBeVisible();

    const burger = page.locator('button[aria-label="Open navigation"]');
    await expect(burger).toBeHidden();

    await noHorizontalOverflow(page);
  });
});
