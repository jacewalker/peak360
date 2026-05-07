type StatusPillProps = { status: 'accepted' | 'pending' };

/**
 * Reusable pill component for invitation status (UI-SPEC §Component Inventory).
 * Binding copy: pill renders the literal labels green=accepted, amber=pending.
 * No additional states — UI-SPEC scope.
 */
export default function StatusPill({ status }: StatusPillProps) {
  if (status === 'accepted') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
        Accepted
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      Pending
    </span>
  );
}
