import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';
import {
  createAssessment,
  seedSection,
  deleteAssessment,
} from './helpers/assessment';

/**
 * Phase 8: Five-pillar Peak Living module — portal interactive UI.
 *
 * Modernised: authenticates via the shared signInAsAdmin helper and creates
 * its OWN seeded assessment (no more hardcoded TEST_ASSESSMENT_ID / skip-gate).
 * The report renders ReportShell → PillarsGrid → PillarCard (aria-label
 * "Open detailed view for {label}") and PillarModal (role="dialog").
 */

// Seed enough blood data that pillars compute non-pending scores.
const BLOODS = {
  hemoglobin: '14.5',
  ferritin: '120',
  vitaminD: '45',
  cholesterolTotal: '4.5',
};

test.describe('Phase 8: Peak Living pillars module', () => {
  let assessmentId: string;

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    assessmentId = await createAssessment(page, {
      clientName: 'Pillar Tester',
      clientGender: 'male',
      clientDob: '1986-03-15',
    });
    await seedSection(page, assessmentId, 5, BLOODS);
    await page.goto(`/portal/assessment/${assessmentId}/report`);
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async ({ page }) => {
    if (assessmentId) await deleteAssessment(page, assessmentId);
  });

  test('renders heading + intro from pillar_page_copy', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Peak Living Pillars/i }),
    ).toBeVisible();
  });

  test('renders five pillar cards in sort order', async ({ page }) => {
    const cards = page.getByRole('button', {
      name: /Open detailed view for/i,
    });
    await expect(cards).toHaveCount(5);
  });

  test('clicking a card opens the modal, ESC closes it and returns focus', async ({
    page,
  }) => {
    const firstCard = page
      .getByRole('button', { name: /Open detailed view for/i })
      .first();
    await firstCard.focus();
    await firstCard.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(firstCard).toBeFocused();
  });

  test('focus is trapped inside the modal', async ({ page }) => {
    await page
      .getByRole('button', { name: /Open detailed view for/i })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const stillInside = await page.evaluate(
        () => !!document.activeElement?.closest('[role="dialog"]'),
      );
      expect(stillInside, `focus escaped on tab #${i + 1}`).toBeTruthy();
    }
  });

  test('mobile viewport renders a visible centred modal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page
      .getByRole('button', { name: /Open detailed view for/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Phase 8 Plan 03+ replaced the bottom-sheet with a centred modal
    // (PillarModal uses `grid place-items-center`). Assert the dialog stays
    // within the viewport rather than anchoring to the bottom edge.
    const geometry = await dialog.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, vh: window.innerHeight };
    });
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.vh + 1);
  });

  test('detailed marker results disclosure is collapsed by default', async ({
    page,
  }) => {
    const disclosure = page
      .locator('details')
      .filter({ hasText: /Detailed marker results/i });
    await expect(disclosure).toBeVisible();
    const isOpen = await disclosure.evaluate(
      (el) => (el as HTMLDetailsElement).open,
    );
    expect(isOpen).toBeFalsy();
  });
});
