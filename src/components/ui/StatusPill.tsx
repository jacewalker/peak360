type StatusPillProps = { status: 'accepted' | 'pending' | 'banned' };

/**
 * Reusable status pill (UI-SPEC §Component Inventory).
 *
 * Variants:
 * - accepted: green — invitation accepted
 * - pending:  amber — invitation outstanding
 * - banned:   red   — user is banned (read-only indicator; ban/unban actions
 *                     are a Deferred Idea per phase CONTEXT). Added per
 *                     BLOCKER 1 fix to satisfy REQ-7.10 (SPEC line 152).
 */
export default function StatusPill({ status }: StatusPillProps) {
  if (status === 'accepted') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
        Accepted
      </span>
    );
  }
  if (status === 'banned') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600" aria-hidden />
        Banned
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      Pending
    </span>
  );
}
