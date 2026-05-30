import { db } from '@/lib/db';
import { assessments, assessmentSections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getReportMarkers } from '@/lib/markers/registry';
import { getPeak360Rating, getStandardsWithOverrides } from '@/lib/normative/ratings';
import { preloadDbRanges } from '@/lib/normative/db-ranges';
import { generatePeak360Insights } from '@/lib/normative/insights';
import { decrypt } from '@/lib/crypto';
import type { RatingTier } from '@/types/normative';
import type { ReportData, ReportMarker } from '@/lib/pdf/types';
import {
  getPillarDefinitions,
  getPillarPageCopy,
  getPillarPrescriptions,
} from '@/lib/pillars/queries';

const ENCRYPTED_SECTIONS = new Set([3, 4, 5]);

export async function loadReportData(assessmentId: string): Promise<ReportData> {
  // Fetch assessment metadata
  const [assessment] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, assessmentId));

  if (!assessment) {
    throw new Error(`Assessment not found: ${assessmentId}`);
  }

  // Fetch all section data in one query
  const sectionRows = await db
    .select()
    .from(assessmentSections)
    .where(eq(assessmentSections.assessmentId, assessmentId));

  // Partition by section number; decrypt sensitive sections at read time.
  const sections: Record<number, Record<string, unknown>> = {};
  for (const row of sectionRows) {
    let parsed: unknown;
    if (typeof row.data === 'string') {
      const raw = ENCRYPTED_SECTIONS.has(row.sectionNumber) ? decrypt(row.data) : row.data;
      parsed = JSON.parse(raw);
    } else {
      parsed = row.data;
    }
    sections[row.sectionNumber] = (parsed || {}) as Record<string, unknown>;
  }

  const clientInfo = sections[1] || {};
  const readiness = sections[2] || {};
  const medical = sections[3] || {};
  const consent = sections[4] || {};

  // Derive age and gender from client info (same as Section11)
  const age = (clientInfo.clientAge as number) || null;
  const gender = (clientInfo.clientGender as string) || assessment.clientGender || null;

  // Evaluate all markers (mirrors Section11 useEffect logic). Phase 12 D-11:
  // pull from the merged registry (seed + DB) so admin-added markers flow into
  // the PDF report identically to seeded markers.
  const reportMarkers = await getReportMarkers();
  // Phase 12 - DB normative overrides (admin-added markers + edited seed
  // ranges). Without this, admin-created markers never resolve a tier and
  // show as "Recorded" instead of their actual rating in the report/pillars.
  const dbRangesMap = await preloadDbRanges();
  const evaluated: ReportMarker[] = [];
  const counts: Record<RatingTier, number> = {
    elite: 0, great: 0, normal: 0, cautious: 0, poor: 0,
  };

  for (const m of reportMarkers) {
    const sectionData = sections[m.section] || {};
    const rawValue = sectionData[m.dataKey];
    const value = rawValue != null ? Number(rawValue) : null;

    const standards = m.hasNorms
      ? getStandardsWithOverrides(m.testKey, age, gender, dbRangesMap)
      : null;

    if (value === null || isNaN(value)) {
      evaluated.push({
        key: m.testKey,
        label: m.label,
        value: null,
        tier: null,
        unit: m.fallbackUnit || '',
        category: m.category,
        subcategory: m.subcategory,
        hasNorms: m.hasNorms,
        resolvedStandards: standards?.standards || null,
      });
      continue;
    }

    const rating = getPeak360Rating(m.testKey, value, age, gender, dbRangesMap);
    const tier = rating?.tier || null;
    if (tier) counts[tier]++;

    evaluated.push({
      key: m.testKey,
      label: m.label,
      value,
      tier,
      unit: rating?.unit || m.fallbackUnit || '',
      category: m.category,
      subcategory: m.subcategory,
      hasNorms: m.hasNorms,
      resolvedStandards: standards?.standards || null,
    });
  }

  // Generate insights (same as Section11)
  const insightMarkers = evaluated
    .filter((m) => m.value !== null)
    .map((m) => ({ testKey: m.key, label: m.label, value: m.value }));
  const insights = generatePeak360Insights({ age, gender, markers: insightMarkers });

  const totalRated = Object.values(counts).reduce((a, b) => a + b, 0);

  // Phase 8 - fetch pillar layer in parallel (D-21 SSR reads).
  // Both the portal report page (Plan 03) and the PDF route (Plan 05)
  // share this loader so PDF and portal scores stay identical.
  const [definitions, pageCopy, prescriptions] = await Promise.all([
    getPillarDefinitions(),
    getPillarPageCopy(),
    getPillarPrescriptions(assessmentId),
  ]);

  return {
    assessmentId,
    clientName: (clientInfo.clientName as string) || assessment.clientName || '',
    clientAge: age,
    clientGender: gender,
    clientEmail: (clientInfo.clientEmail as string) || assessment.clientEmail || null,
    clientDob: (clientInfo.clientDOB as string) || assessment.clientDob || null,
    assessmentDate: (clientInfo.assessmentDate as string) || assessment.assessmentDate || new Date().toISOString(),
    readiness,
    medical,
    consent,
    markers: evaluated,
    insights,
    tierCounts: counts,
    totalRated,
    definitions,
    pageCopy,
    prescriptions,
  };
}
