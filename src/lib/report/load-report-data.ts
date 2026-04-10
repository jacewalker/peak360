import { db } from '@/lib/db';
import { assessments, assessmentSections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { REPORT_MARKERS } from '@/lib/report-markers';
import { getPeak360Rating, getStandards } from '@/lib/normative/ratings';
import { generatePeak360Insights } from '@/lib/normative/insights';
import type { RatingTier } from '@/types/normative';
import type { ReportData, ReportMarker } from '@/lib/pdf/types';

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

  // Partition by section number
  const sections: Record<number, Record<string, unknown>> = {};
  for (const row of sectionRows) {
    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    sections[row.sectionNumber] = (data || {}) as Record<string, unknown>;
  }

  const clientInfo = sections[1] || {};
  const readiness = sections[2] || {};
  const medical = sections[3] || {};
  const consent = sections[4] || {};

  // Derive age and gender from client info (same as Section11)
  const age = (clientInfo.clientAge as number) || null;
  const gender = (clientInfo.clientGender as string) || assessment.clientGender || null;

  // Evaluate all markers (mirrors Section11 useEffect logic)
  const evaluated: ReportMarker[] = [];
  const counts: Record<RatingTier, number> = {
    elite: 0, great: 0, normal: 0, cautious: 0, poor: 0,
  };

  for (const m of REPORT_MARKERS) {
    const sectionData = sections[m.section] || {};
    const rawValue = sectionData[m.dataKey];
    const value = rawValue != null ? Number(rawValue) : null;

    const standards = m.hasNorms ? getStandards(m.testKey, age, gender) : null;

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

    const rating = getPeak360Rating(m.testKey, value, age, gender);
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
  };
}
