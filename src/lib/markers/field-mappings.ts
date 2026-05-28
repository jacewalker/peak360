import { fieldMappings } from '@/lib/ai/field-mappings';
import { getAllMarkers } from '@/lib/markers/queries';

/**
 * Phase 12 - Admin-managed marker registry (D-04).
 *
 * Returns the merged record of hardcoded fieldMappings + DB-row aiAliases
 * for the AI extraction pipeline. Aliases are lowercased and trimmed before
 * insertion; empty/whitespace-only aliases are skipped. DB aliases win on
 * collision with the hardcoded baseline (allows admins to override an
 * existing alias's target if needed).
 *
 * Consumed by /api/ai/extract (call once per request to pick up the latest
 * registry). Async, no cache: the alias map is small and the DB read is one
 * select. Matches the same posture as getReportMarkers().
 */
export async function getFieldMappings(): Promise<Record<string, string>> {
  const dbRows = await getAllMarkers();
  const merged: Record<string, string> = { ...fieldMappings };

  for (const m of dbRows) {
    if (!Array.isArray(m.aiAliases) || m.aiAliases.length === 0) continue;
    for (const alias of m.aiAliases) {
      const key = String(alias).toLowerCase().trim();
      if (!key) continue;
      // DB wins on collision (per D-04) - applied after the spread above.
      merged[key] = m.dataKey;
    }
  }

  return merged;
}
