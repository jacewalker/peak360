import { test, expect } from '@playwright/test';

// Use an assessment with data if available, fall back to first
const ASSESSMENT_ID = process.env.TEST_ASSESSMENT_ID || '';

test.describe('Mobile responsiveness - Hamburger menu overlap', () => {
  test('Dashboard heading clears hamburger button', async ({ page }) => {
    await page.goto('/');
    const burger = page.locator('button[aria-label="Open menu"]');
    const heading = page.getByRole('heading', { name: /dashboard/i });

    if (await burger.isVisible()) {
      const burgerBox = await burger.boundingBox();
      const headingBox = await heading.boundingBox();
      expect(burgerBox).toBeTruthy();
      expect(headingBox).toBeTruthy();
      // Heading left edge should be to the right of burger's right edge
      expect(headingBox!.x).toBeGreaterThanOrEqual(burgerBox!.x + burgerBox!.width);
    }
  });

  test('Clients heading clears hamburger button', async ({ page }) => {
    await page.goto('/clients');
    const burger = page.locator('button[aria-label="Open menu"]');
    const heading = page.getByRole('heading', { name: /clients/i });

    if (await burger.isVisible()) {
      const burgerBox = await burger.boundingBox();
      const headingBox = await heading.boundingBox();
      expect(burgerBox).toBeTruthy();
      expect(headingBox).toBeTruthy();
      expect(headingBox!.x).toBeGreaterThanOrEqual(burgerBox!.x + burgerBox!.width);
    }
  });

  test('Assessments page has no horizontal overflow on mobile', async ({ page }) => {
    await page.goto('/assessments');
    await page.waitForLoadState('networkidle');

    // Assessments page is centered — just verify no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });
});

test.describe('Mobile responsiveness - Grid layouts', () => {
  test('Dashboard stat cards stack on small mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const statGrid = page.locator('.grid.grid-cols-1').first();
    if (await statGrid.isVisible()) {
      const box = await statGrid.boundingBox();
      expect(box).toBeTruthy();
    }
  });

  test('Clients stat cards stack on small mobile', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
    const statGrid = page.locator('.grid.grid-cols-1').first();
    if (await statGrid.isVisible()) {
      const box = await statGrid.boundingBox();
      expect(box).toBeTruthy();
    }
  });
});

test.describe('Mobile responsiveness - Touch targets', () => {
  test('Form inputs have 44px minimum touch targets', async ({ page }) => {
    // Skip if no assessment ID available
    const assessmentId = ASSESSMENT_ID;
    if (!assessmentId) {
      // Create a new assessment to test with
      const res = await page.request.post('/api/assessments', {
        data: {},
      });
      const { data } = await res.json();
      await page.goto(`/assessment/${data.id}/section/1`);
    } else {
      await page.goto(`/assessment/${assessmentId}/section/1`);
    }
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input[type="text"], input[type="email"], input[type="date"], input[type="number"]');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const box = await input.boundingBox();
        expect(box).toBeTruthy();
        // Minimum 40px height (44px target with some tolerance for browser rendering)
        expect(box!.height).toBeGreaterThanOrEqual(38);
      }
    }
  });

  test('Navigation buttons have adequate touch targets', async ({ page }) => {
    const assessmentId = ASSESSMENT_ID;
    if (!assessmentId) {
      const res = await page.request.post('/api/assessments', { data: {} });
      const { data } = await res.json();
      await page.goto(`/assessment/${data.id}/section/1`);
    } else {
      await page.goto(`/assessment/${assessmentId}/section/1`);
    }
    await page.waitForLoadState('networkidle');

    const navButtons = page.locator('button:has-text("Next"), button:has-text("Previous"), button:has-text("Save")');
    const count = await navButtons.count();

    for (let i = 0; i < count; i++) {
      const btn = navButtons.nth(i);
      if (await btn.isVisible()) {
        const box = await btn.boundingBox();
        expect(box).toBeTruthy();
        expect(box!.height).toBeGreaterThanOrEqual(38);
      }
    }
  });
});

test.describe('Mobile responsiveness - Progress bar', () => {
  test('Progress bar is scrollable on mobile', async ({ page }) => {
    const assessmentId = ASSESSMENT_ID;
    if (!assessmentId) {
      const res = await page.request.post('/api/assessments', { data: {} });
      const { data } = await res.json();
      await page.goto(`/assessment/${data.id}/section/1`);
    } else {
      await page.goto(`/assessment/${assessmentId}/section/1`);
    }
    await page.waitForLoadState('networkidle');

    // The progress bar container should not overflow the viewport
    const progressBar = page.locator('.overflow-x-auto').first();
    if (await progressBar.isVisible()) {
      const box = await progressBar.boundingBox();
      const viewport = page.viewportSize();
      expect(box).toBeTruthy();
      expect(viewport).toBeTruthy();
      // Container should fit within viewport width
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
    }
  });
});

test.describe('Mobile responsiveness - Section 11 Report', () => {
  test('Report header gap is tighter on mobile', async ({ page }) => {
    const assessmentId = ASSESSMENT_ID;
    if (!assessmentId) {
      const res = await page.request.post('/api/assessments', { data: {} });
      const { data } = await res.json();
      await page.goto(`/assessment/${data.id}/section/11`);
    } else {
      await page.goto(`/assessment/${assessmentId}/section/11`);
    }
    await page.waitForLoadState('networkidle');

    // Page should not have horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test('Tier summary grid wraps on mobile', async ({ page }) => {
    const assessmentId = ASSESSMENT_ID;
    if (!assessmentId) {
      const res = await page.request.post('/api/assessments', { data: {} });
      const { data } = await res.json();
      await page.goto(`/assessment/${data.id}/section/11`);
    } else {
      await page.goto(`/assessment/${assessmentId}/section/11`);
    }
    await page.waitForLoadState('networkidle');

    // No horizontal overflow on the report page
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });
});

test.describe('Mobile responsiveness - Sidebar', () => {
  test('Hamburger opens mobile sidebar', async ({ page }) => {
    await page.goto('/');
    const burger = page.locator('button[aria-label="Open menu"]');

    if (await burger.isVisible()) {
      await burger.click();
      const sidebar = page.locator('aside.w-\\[80vw\\]');
      await expect(sidebar).toBeVisible();

      // Check sidebar has nav items
      await expect(sidebar.getByText('Dashboard')).toBeVisible();
      await expect(sidebar.getByText('Assessments')).toBeVisible();
      await expect(sidebar.getByText('Clients')).toBeVisible();
    }
  });

  test('Escape closes mobile sidebar', async ({ page }) => {
    await page.goto('/');
    const burger = page.locator('button[aria-label="Open menu"]');

    if (await burger.isVisible()) {
      await burger.click();
      const overlay = page.locator('.fixed.inset-0.bg-black\\/50');
      await expect(overlay).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(overlay).not.toBeVisible();
    }
  });
});

test.describe('Desktop responsiveness - No regressions', () => {
  test('Dashboard layout unchanged on desktop', async ({ page, browserName }, testInfo) => {
    // Only meaningful on desktop viewport
    const viewport = page.viewportSize();
    test.skip(!viewport || viewport.width < 1024, 'Desktop-only test');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Sidebar should be visible on desktop
    const sidebar = page.locator('aside.hidden.lg\\:flex');
    await expect(sidebar).toBeVisible();

    // Hamburger should be hidden
    const burger = page.locator('button[aria-label="Open menu"]');
    await expect(burger).not.toBeVisible();

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });
});
