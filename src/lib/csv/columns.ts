export interface CsvColumn {
  csvColumn: string;
  sectionNumber: number | null; // null = assessment metadata
  fieldKey: string;
}

// Assessment metadata columns — always present, always first
export const META_COLUMNS: CsvColumn[] = [
  { csvColumn: 'id', sectionNumber: null, fieldKey: 'id' },
  { csvColumn: 'status', sectionNumber: null, fieldKey: 'status' },
  { csvColumn: 'currentSection', sectionNumber: null, fieldKey: 'currentSection' },
  { csvColumn: 'assessmentDate', sectionNumber: null, fieldKey: 'assessmentDate' },
  { csvColumn: 'createdAt', sectionNumber: null, fieldKey: 'createdAt' },
  { csvColumn: 'updatedAt', sectionNumber: null, fieldKey: 'updatedAt' },
];

/**
 * Build section columns dynamically from actual DB data.
 * Scans all section JSON blobs and collects every unique field key per section.
 */
export function buildSectionColumns(
  allSectionData: { sectionNumber: number; data: Record<string, unknown> }[]
): CsvColumn[] {
  // Collect unique keys per section, preserving insertion order
  const keysPerSection = new Map<number, Set<string>>();
  for (const { sectionNumber, data } of allSectionData) {
    if (sectionNumber < 1 || sectionNumber > 10) continue;
    if (!keysPerSection.has(sectionNumber)) keysPerSection.set(sectionNumber, new Set());
    const keySet = keysPerSection.get(sectionNumber)!;
    for (const key of Object.keys(data)) {
      keySet.add(key);
    }
  }

  const columns: CsvColumn[] = [];
  // Sections 1-10 in order
  for (let s = 1; s <= 10; s++) {
    const keys = keysPerSection.get(s);
    if (!keys) continue;
    // Sort keys alphabetically for deterministic output
    for (const key of [...keys].sort()) {
      columns.push({
        csvColumn: `s${s}_${key}`,
        sectionNumber: s,
        fieldKey: key,
      });
    }
  }

  return columns;
}

/**
 * Parse a CSV header back into a CsvColumn.
 * Returns null for unrecognized headers.
 */
export function parseHeader(header: string): CsvColumn | null {
  // Check metadata columns
  const meta = META_COLUMNS.find((c) => c.csvColumn === header);
  if (meta) return meta;

  // Check s{N}_ pattern
  const match = header.match(/^s(\d+)_(.+)$/);
  if (match) {
    const sectionNumber = parseInt(match[1]);
    const fieldKey = match[2];
    if (sectionNumber >= 1 && sectionNumber <= 10) {
      return { csvColumn: header, sectionNumber, fieldKey };
    }
  }

  return null;
}
