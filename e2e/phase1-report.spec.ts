import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';
import {
  createAssessment,
  seedSection,
  deleteAssessment,
} from './helpers/assessment';

/**
 * Phase 1: Clinical Accuracy & Report Quality.
 *
 * Modernised for the Phase 7 auth gate + Phase 8/9 portal report. The report
 * now lives at /portal/assessment/:id/report and renders the Peak Living
 * five-pillar grid (ReportShell → PillarsGrid → PillarCard) plus a collapsed
 * "Detailed marker results" disclosure — Section 11's standalone disclaimer /
 * range-bar / referral chrome moved to the PDF surface.
 *
 * Original test INTENT preserved: gender-aware ratings (male vs female differ
 * for the same hemoglobin value), report renders for a seeded female client,
 * and the detailed marker breakdown surfaces seeded blood values.
 */

// Section 5 blood values reused from the original spec (still valid field keys).
const FEMALE_BLOODS = {
  hemoglobin: '13.5', // normal for female
  ferritin: '8', // poor
  vitaminD: '15', // poor — referral tier
  cholesterolTotal: '5.5', // cautious
};

test.describe('Phase 1: Clinical Accuracy & Report Quality', () => {
  const createdIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    for (const id of createdIds.splice(0)) {
      await deleteAssessment(page, id);
    }
  });

  test('full report flow renders pillars for a seeded female client', async ({
    page,
  }) => {
    const id = await createAssessment(page, {
      clientName: 'Test Client',
      clientGender: 'female',
      clientDob: '1986-03-15',
    });
    createdIds.push(id);
    // Section 1 sync (clientDOB/clientGender keys are read by the PUT route).
    await seedSection(page, id, 1, {
      clientName: 'Test Client',
      clientGender: 'female',
      clientDOB: '1986-03-15',
    });
    await seedSection(page, id, 5, FEMALE_BLOODS);

    await page.goto(`/portal/assessment/${id}/report`);
    await page.waitForLoadState('domcontentloaded');

    // Peak Living pillars heading + five pillar cards.
    await expect(
      page.getByRole('heading', { name: /Peak Living Pillars/i }),
    ).toBeVisible();
    const cards = page.getByRole('button', {
      name: /Open detailed view for/i,
    });
    await expect(cards).toHaveCount(5);

    // Detailed marker disclosure is present and, once expanded, surfaces the
    // seeded blood markers with their values.
    const disclosure = page
      .locator('details')
      .filter({ hasText: /Detailed marker results/i });
    await expect(disclosure).toBeVisible();
    await disclosure.locator('summary').click();
    await expect(page.getByText('Hemoglobin').first()).toBeVisible();
    await expect(page.getByText('Ferritin').first()).toBeVisible();
  });

  test('gender differentiation — male vs female reports differ for hemoglobin 13.5', async ({
    page,
  }) => {
    const femaleId = await createAssessment(page, {
      clientName: 'Female Client',
      clientGender: 'female',
      clientDob: '1986-03-15',
    });
    createdIds.push(femaleId);
    await seedSection(page, femaleId, 5, { hemoglobin: '13.5' });

    const maleId = await createAssessment(page, {
      clientName: 'Male Client',
      clientGender: 'male',
      clientDob: '1986-03-15',
    });
    createdIds.push(maleId);
    await seedSection(page, maleId, 5, { hemoglobin: '13.5' });

    // Expand the detailed marker disclosure on each report and capture the
    // hemoglobin tier pill text — male 13.5 = cautious, female 13.5 = normal.
    async function hemoglobinTier(id: string): Promise<string> {
      await page.goto(`/portal/assessment/${id}/report`);
      await page.waitForLoadState('domcontentloaded');
      const disclosure = page
        .locator('details')
        .filter({ hasText: /Detailed marker results/i });
      await disclosure.locator('summary').click();
      const row = page
        .locator('div', { hasText: /^Hemoglobin/ })
        .filter({ has: page.locator('.report-tier-pill') })
        .first();
      return ((await row.textContent()) ?? '').trim();
    }

    const femaleRow = await hemoglobinTier(femaleId);
    const maleRow = await hemoglobinTier(maleId);

    expect(femaleRow).toBeTruthy();
    expect(maleRow).toBeTruthy();
    // Gender-aware rating must produce a different tier for the same value.
    expect(femaleRow).not.toBe(maleRow);
  });

  test('report renders with pillar cards even when no markers seeded', async ({
    page,
  }) => {
    const id = await createAssessment(page, { clientName: 'Empty Client' });
    createdIds.push(id);

    await page.goto(`/portal/assessment/${id}/report`);
    await page.waitForLoadState('domcontentloaded');

    // Pillars always render; with no data they show the pending "Awaiting data" state.
    const cards = page.getByRole('button', {
      name: /Open detailed view for/i,
    });
    await expect(cards).toHaveCount(5);
    await expect(page.getByText('Awaiting data').first()).toBeVisible();
  });

  test('clicking a pillar card opens the detail modal', async ({ page }) => {
    const id = await createAssessment(page, {
      clientName: 'Modal Client',
      clientGender: 'male',
      clientDob: '1986-03-15',
    });
    createdIds.push(id);
    await seedSection(page, id, 5, FEMALE_BLOODS);

    await page.goto(`/portal/assessment/${id}/report`);
    await page.waitForLoadState('domcontentloaded');

    await page
      .getByRole('button', { name: /Open detailed view for/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Drill-down renders the "What this pillar means" section.
    await expect(
      dialog.getByText(/What this pillar means/i),
    ).toBeVisible();
  });
});
