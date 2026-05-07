type RolePillProps = { role: 'admin' | 'coach' | 'client' };

/**
 * Role pill component (UI-SPEC §Color §Role-pill colors — BINDING).
 * - admin: navy
 * - coach: slate
 * - client: white/muted
 *
 * Gold is reserved for active sidebar / commit-flash and is intentionally
 * NOT used here.
 */
export default function RolePill({ role }: RolePillProps) {
  const className =
    role === 'admin'
      ? 'bg-navy/10 text-navy border-navy/20'
      : role === 'coach'
        ? 'bg-slate-100 text-slate-700 border-slate-200'
        : 'bg-white text-muted border-border';
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${className}`}
    >
      {role}
    </span>
  );
}
