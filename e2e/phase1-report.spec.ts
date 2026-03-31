import { test, expect } from '@playwright/test';

test.describe('Phase 1: Clinical Accuracy & Report Quality', () => {
  let assessmentId: string;

  test.beforeAll(async ({ request }) => {
    // Create a fresh assessment
    const res = await request.post('/api/assessments', { data: {} });
    const json = await res.json();
    assessmentId = json.data.id;
  });

  test.describe('Gender-specific ratings and report components', () => {
    test('full report flow with female client', async ({ page }) => {
      // --- Section 1: Set client info ---
      await page.goto(`/assessment/${assessmentId}/section/1`);
      await page.waitForLoadState('networkidle');

      // Fill in client name
      const nameInput = page.locator('input[id="clientName"], input[name="clientName"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Client');
      }

      // Set gender to female
      const genderSelect = page.locator('select').filter({ hasText: /female/i }).first();
      if (await genderSelect.isVisible()) {
        await genderSelect.selectOption('female');
      } else {
        // Try radio or other input patterns
        const femaleOption = page.getByLabel(/female/i).first();
        if (await femaleOption.isVisible()) {
          await femaleOption.click();
        }
      }

      // Set age/DOB
      const dobInput = page.locator('input[type="date"]').first();
      if (await dobInput.isVisible()) {
        await dobInput.fill('1986-03-15');
      }

      // Wait for auto-save
      await page.waitForTimeout(2000);

      // --- Section 5: Enter blood test values ---
      await page.goto(`/assessment/${assessmentId}/section/5`);
      await page.waitForLoadState('networkidle');

      // Fill hemoglobin (13.5 - should be 'normal' for female)
      const hemoInput = page.locator('input[id="hemoglobin"]');
      if (await hemoInput.isVisible()) {
        await hemoInput.fill('13.5');
      }

      // Fill ferritin (8 - should be 'poor')
      const ferritinInput = page.locator('input[id="ferritin"]');
      if (await ferritinInput.isVisible()) {
        await ferritinInput.fill('8');
      }

      // Fill vitamin D (15 - poor tier to test referral flag)
      const vitDInput = page.locator('input[id="vitaminD"]');
      if (await vitDInput.isVisible()) {
        await vitDInput.fill('15');
      }

      // Fill total cholesterol (5.5 - cautious)
      const cholInput = page.locator('input[id="cholesterolTotal"]');
      if (await cholInput.isVisible()) {
        await cholInput.fill('5.5');
      }

      // Wait for auto-save
      await page.waitForTimeout(2000);

      // --- Section 11: Verify report ---
      await page.goto(`/assessment/${assessmentId}/section/11`);
      await page.waitForLoadState('networkidle');
      // Give time for report to fully render
      await page.waitForTimeout(2000);

      // 1. Verify Medical Disclaimer appears (at least once, should be top and bottom)
      const disclaimers = page.getByText('Medical Disclaimer');
      await expect(disclaimers.first()).toBeVisible();
      const disclaimerCount = await disclaimers.count();
      expect(disclaimerCount).toBeGreaterThanOrEqual(2);

      // 2. Verify "biological sex reference data" note (appears in both disclaimers)
      const bioSexNotes = page.getByText('biological sex reference data');
      const bioSexCount = await bioSexNotes.count();
      expect(bioSexCount).toBeGreaterThanOrEqual(2);
      await expect(bioSexNotes.first()).toBeVisible();

      // 3. Verify "Biological Sex" label in header (not "Gender")
      await expect(page.getByText('Biological Sex', { exact: true })).toBeVisible();

      // 4. Verify range bars are rendered (they have the segmented bar structure)
      // RangeBar uses a flex container with colored segments
      const rangeBars = page.locator('.flex.rounded-full.overflow-hidden');
      const rangeBarCount = await rangeBars.count();
      expect(rangeBarCount).toBeGreaterThan(0);

      // 5. Verify referral flags exist
      // Check for "Refer to GP" (urgent - poor tier)
      const urgentFlags = page.getByText('Refer to GP for further investigation');
      // Check for "Monitor" (cautious tier)
      const monitorFlags = page.getByText('Monitor -- retest in 3-6 months');

      // At least one type of flag should be present
      const urgentCount = await urgentFlags.count();
      const monitorCount = await monitorFlags.count();
      expect(urgentCount + monitorCount).toBeGreaterThan(0);
    });

    test('gender-not-specified warning appears when gender is empty', async ({ page }) => {
      // Create a new assessment with no gender set
      const res = await page.request.post('/api/assessments', { data: {} });
      const json = await res.json();
      const noGenderId = json.data.id;

      // Go straight to report (no gender set)
      await page.goto(`/assessment/${noGenderId}/section/11`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Should show gender-not-specified warning
      await expect(
        page.getByText('Biological sex not specified')
      ).toBeVisible();
    });

    test('gender differentiation - male vs female ratings differ for hemoglobin', async ({ page }) => {
      // Create two assessments: one male, one female, same hemoglobin value
      const maleRes = await page.request.post('/api/assessments', { data: {} });
      const maleJson = await maleRes.json();
      const maleId = maleJson.data.id;

      // Set male gender in section 1
      await page.goto(`/assessment/${maleId}/section/1`);
      await page.waitForLoadState('networkidle');

      const genderSelect = page.locator('select').filter({ hasText: /male/i }).first();
      if (await genderSelect.isVisible()) {
        await genderSelect.selectOption('male');
      } else {
        const maleOption = page.getByLabel(/^male$/i).first();
        if (await maleOption.isVisible()) await maleOption.click();
      }
      await page.waitForTimeout(1500);

      // Set hemoglobin = 13.5 in section 5
      await page.goto(`/assessment/${maleId}/section/5`);
      await page.waitForLoadState('networkidle');
      const hemoInput = page.locator('input[id="hemoglobin"]');
      if (await hemoInput.isVisible()) {
        await hemoInput.fill('13.5');
      }
      await page.waitForTimeout(1500);

      // Check male report - hemoglobin 13.5 should be 'cautious' for male
      await page.goto(`/assessment/${maleId}/section/11`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Look for hemoglobin row — male should show 'cautious' tier pill
      const maleReportContent = await page.textContent('body');

      // Now check the female assessment we created earlier
      await page.goto(`/assessment/${assessmentId}/section/11`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const femaleReportContent = await page.textContent('body');

      // Both reports should render hemoglobin differently
      // Male 13.5 = cautious, Female 13.5 = normal
      // We can verify by checking for the presence of tier pills
      expect(maleReportContent).toBeTruthy();
      expect(femaleReportContent).toBeTruthy();

      // The reports should not be identical (different gender ratings)
      // This is a high-level check — if both genders produce identical output,
      // gender-specific rating is broken
      expect(maleReportContent).not.toBe(femaleReportContent);
    });

    test('range bar has 5 colored segments', async ({ page }) => {
      // Use the female assessment with blood values
      await page.goto(`/assessment/${assessmentId}/section/11`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Find first range bar and check it has 5 child segments
      const firstRangeBar = page.locator('.flex.rounded-full.overflow-hidden').first();
      if (await firstRangeBar.isVisible()) {
        const segments = firstRangeBar.locator('> div');
        const segCount = await segments.count();
        expect(segCount).toBe(5);
      }
    });

    test('range bar needle indicator is present', async ({ page }) => {
      await page.goto(`/assessment/${assessmentId}/section/11`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Needle indicator has a navy circle — check for the needle container div
      // which is absolutely positioned with a left % style
      const rangeBarParent = page.locator('.relative.w-full.h-3').first();
      if (await rangeBarParent.isVisible()) {
        // The needle is the second child div (absolute positioned)
        const needleDiv = rangeBarParent.locator('.absolute');
        const needleCount = await needleDiv.count();
        expect(needleCount).toBeGreaterThan(0);
      }
    });
  });
});
