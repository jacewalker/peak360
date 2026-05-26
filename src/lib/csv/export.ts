import { db } from '@/lib/db';
import { assessments, assessmentSections } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';
import { META_COLUMNS, buildSectionColumns, type CsvColumn } from './columns';

// Sections 3/4/5 are encrypted at rest (mirror the section load route). Their
// `data` column holds AES ciphertext in production, so it must be decrypted
// before JSON.parse — otherwise the parse throws and the whole export 500s,
// downloading an empty file.
const ENCRYPTED_SECTIONS = new Set([3, 4, 5]);

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function exportCsv(): Promise<string> {
  const allAssessments = await db.select().from(assessments).orderBy(desc(assessments.updatedAt));
  const allSections = await db.select().from(assessmentSections);

  // Parse section data. Decrypt encrypted sections first, and guard each row so
  // one malformed or undecryptable blob can never abort the entire export.
  const parsedSections: { assessmentId: string; sectionNumber: number; data: Record<string, unknown>; completedAt: string | null }[] = [];
  for (const s of allSections) {
    let data: Record<string, unknown> | null = null;
    try {
      if (typeof s.data === 'string') {
        const raw = ENCRYPTED_SECTIONS.has(s.sectionNumber) ? decrypt(s.data) : s.data;
        data = JSON.parse(raw) as Record<string, unknown>;
      } else if (s.data && typeof s.data === 'object') {
        data = s.data as Record<string, unknown>;
      }
    } catch {
      // Skip a section whose blob can't be decrypted/parsed rather than failing
      // the whole CSV. The assessment's other sections still export.
      data = null;
    }
    if (data && typeof data === 'object') {
      parsedSections.push({ assessmentId: s.assessmentId, sectionNumber: s.sectionNumber, data, completedAt: s.completedAt });
    }
  }

  // Build columns dynamically from actual data
  const sectionColumns = buildSectionColumns(parsedSections);

  // Add completedAt columns for each section that exists
  const sectionsPresent = new Set(parsedSections.map((s) => s.sectionNumber));
  const completedAtColumns: CsvColumn[] = [];
  for (let s = 1; s <= 10; s++) {
    if (sectionsPresent.has(s)) {
      completedAtColumns.push({ csvColumn: `s${s}_completedAt`, sectionNumber: s, fieldKey: 'completedAt' });
    }
  }

  const allColumns: CsvColumn[] = [...META_COLUMNS, ...sectionColumns, ...completedAtColumns];

  // Group sections by assessmentId -> sectionNumber -> { data, completedAt }
  const sectionMap = new Map<string, Map<number, { data: Record<string, unknown>; completedAt: string | null }>>();
  for (const s of parsedSections) {
    if (!sectionMap.has(s.assessmentId)) sectionMap.set(s.assessmentId, new Map());
    sectionMap.get(s.assessmentId)!.set(s.sectionNumber, { data: s.data, completedAt: s.completedAt });
  }

  // Build CSV
  const headers = allColumns.map((c) => c.csvColumn);
  const lines: string[] = [headers.map(escapeField).join(',')];

  for (const a of allAssessments) {
    const sections = sectionMap.get(a.id);
    const row = allColumns.map((col) => {
      if (col.sectionNumber === null) {
        return escapeField((a as Record<string, unknown>)[col.fieldKey]);
      }
      const section = sections?.get(col.sectionNumber);
      if (col.fieldKey === 'completedAt') {
        return escapeField(section?.completedAt ?? null);
      }
      return escapeField(section?.data[col.fieldKey] ?? null);
    });
    lines.push(row.join(','));
  }

  return lines.join('\r\n') + '\r\n';
}
