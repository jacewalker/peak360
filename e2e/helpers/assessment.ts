import { expect, type Page } from '@playwright/test';

/**
 * Shared e2e assessment-setup helpers.
 *
 * All helpers use `page.request` so they reuse the signed-in session cookie
 * established by `signInAsAdmin(page)`. Tests run against the SHARED dev
 * Postgres, so every assessment a test creates MUST be deleted in cleanup
 * (see `deleteAssessment`).
 */

interface CreateAssessmentInput {
  clientName?: string;
  clientGender?: 'male' | 'female';
  clientDob?: string;
  clientEmail?: string;
}

/**
 * POST /api/assessments → returns the new assessment id.
 * Client info passed here is persisted on the assessment record directly
 * (clientGender drives the gender-aware report ratings).
 */
export async function createAssessment(
  page: Page,
  input: CreateAssessmentInput = {},
): Promise<string> {
  const res = await page.request.post('/api/assessments', { data: input });
  expect(
    res.ok(),
    `create assessment failed: ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
  const json = await res.json();
  const id = json?.data?.id as string | undefined;
  expect(id, 'create assessment returned no id').toBeTruthy();
  return id as string;
}

/**
 * PUT /api/assessments/:id/sections/:num — seed a section's JSON data blob.
 */
export async function seedSection(
  page: Page,
  id: string,
  num: number,
  data: Record<string, unknown>,
): Promise<void> {
  const res = await page.request.put(
    `/api/assessments/${id}/sections/${num}`,
    { data: { data } },
  );
  expect(
    res.ok(),
    `seed section ${num} failed: ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
}

/**
 * DELETE /api/assessments/:id — best-effort cleanup (ignores failures so a
 * cleanup error never masks the real test result).
 */
export async function deleteAssessment(page: Page, id: string): Promise<void> {
  try {
    await page.request.delete(`/api/assessments/${id}`);
  } catch {
    // best-effort — orphan cleanup is logged by the DB owner, not the test.
  }
}
