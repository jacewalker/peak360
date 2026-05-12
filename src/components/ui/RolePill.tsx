type RolePillProps = { role: 'admin' | 'coach' | 'client' };

/**
 * Role pill component — Phase 9 dark canvas variant.
 *
 * Status colours (gold-brand for admin, line-2 for coach, faint for client)
 * are presentation only; the role-pill is a meta tag, not a status indicator,
 * so we use mono 11px to match the meta eyebrow scale per UI-SPEC §Typography.
 */
export default function RolePill({ role }: RolePillProps) {
  const className =
    role === 'admin'
      ? 'bg-gold-brand/10 text-gold-brand border-gold-brand/30'
      : role === 'coach'
        ? 'bg-bg-2 text-text border-line-2'
        : 'bg-bg-2 text-text-dim border-line';
  return (
    <span
      className={`font-mono text-[11px] font-medium uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border ${className}`}
    >
      {role}
    </span>
  );
}
