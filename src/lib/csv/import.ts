import { db } from '@/lib/db';
import { assessments, assessmentSections } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';
import { parseHeader, type CsvColumn } from './columns';

export interface ImportResult {
  imported: number;
  assessments: { sourceId: string; newId: string; clientName: string }[];
  errors: string[];
  warnings: string[];
}

// RFC 4180 CSV parser — handles quoted fields, embedded newlines, BOM
function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < input.length && input[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\r') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        i++;
        if (i < input.length && input[i] === '\n') i++;
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export async function importCsv(csvText: string): Promise<ImportResult> {
  const rows = parseCsv(csvText);
  if (rows.length < 1) return { imported: 0, assessments: [], errors: ['Empty CSV file'], warnings: [] };

  const headerRow = rows[0];

  // Parse each header into a CsvColumn (or null if unrecognized)
  const headerMap: (CsvColumn | null)[] = headerRow.map((h) => parseHeader(h.trim()));

  const result: ImportResult = { imported: 0, assessments: [], errors: [], warnings: [] };
  const unknownHeaders = headerRow.filter((h, i) => h.trim() && !headerMap[i]);
  if (unknownHeaders.length > 0) {
    result.warnings.push(`Unknown columns ignored: ${unknownHeaders.join(', ')}`);
  }

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.length === 0 || (cells.length === 1 && cells[0].trim() === '')) continue;

    try {
      const newId = uuid();
      const now = new Date().toISOString();
      const sectionData = new Map<number, Record<string, unknown>>();
      const sectionCompletedAt = new Map<number, string | null>();
      let sourceId = '';
      const metaValues: Record<string, unknown> = {};

      for (let c = 0; c < headerMap.length && c < cells.length; c++) {
        const col = headerMap[c];
        if (!col) continue;
        const raw = cells[c];

        if (col.sectionNumber === null) {
          metaValues[col.fieldKey] = raw === '' ? null : raw;
          if (col.fieldKey === 'id') sourceId = raw;
          if (col.fieldKey === 'currentSection') metaValues[col.fieldKey] = raw ? parseInt(raw) || 1 : 1;
        } else {
          // Special handling for completedAt (row-level, not inside JSON blob)
          if (col.fieldKey === 'completedAt') {
            sectionCompletedAt.set(col.sectionNumber, raw && raw.trim() !== '' ? raw : null);
            continue;
          }
          if (!sectionData.has(col.sectionNumber)) sectionData.set(col.sectionNumber, {});
          // Store value as-is; preserve numbers as numbers if parseable
          const num = Number(raw);
          const value = raw === '' ? null : raw === 'true' ? true : raw === 'false' ? false : !isNaN(num) && raw.trim() !== '' ? num : raw;
          sectionData.get(col.sectionNumber)![col.fieldKey] = value;
        }
      }

      // Create assessment record
      const s1Data = sectionData.get(1) as Record<string, unknown> | undefined;
      await db.insert(assessments).values({
        id: newId,
        clientName: (s1Data?.clientName as string) || null,
        clientEmail: (s1Data?.clientEmail as string) || null,
        clientDob: (s1Data?.clientDOB as string) || (s1Data?.clientDob as string) || null,
        clientGender: (s1Data?.clientGender as string) || null,
        assessmentDate: (metaValues.assessmentDate as string) || (s1Data?.assessmentDate as string) || now.split('T')[0],
        currentSection: (metaValues.currentSection as number) || 1,
        status: (metaValues.status as string) || 'in_progress',
        createdAt: now,
        updatedAt: now,
      });

      // Insert section data
      for (const [sectionNumber, data] of sectionData) {
        const hasData = Object.values(data).some((v) => v !== null && v !== undefined && v !== '');
        if (!hasData) continue;

        await db.insert(assessmentSections).values({
          assessmentId: newId,
          sectionNumber,
          data,
          completedAt: sectionCompletedAt.get(sectionNumber) ?? null,
        });
      }

      const clientName = (s1Data?.clientName as string) || 'Unknown';
      result.assessments.push({ sourceId, newId, clientName });
      result.imported++;
    } catch (err) {
      result.errors.push(`Row ${r + 1}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
