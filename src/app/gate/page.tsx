import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Peak360 — Restricted',
  robots: { index: false, follow: false },
};

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const showError = sp.error === '1';
  const next = sp.next ?? '';

  return (
    <div className="v2-root">
      <div className="grain" aria-hidden="true" />
      <style>{`
        .gate-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 2rem 1rem;
        }
        .gate-card {
          width: 100%;
          max-width: 26rem;
          padding: 2.5rem 2rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          border-radius: 4px;
          backdrop-filter: blur(6px);
        }
        .gate-h1 {
          font-family: 'Inter Tight', system-ui, sans-serif;
          font-weight: 300;
          font-size: 1.75rem;
          line-height: 1.15;
          margin: 0.75rem 0 1.5rem;
          color: #f4f1ec;
        }
        .gate-h1 .gold { color: var(--gold); }
        .gate-input {
          width: 100%;
          padding: 0.85rem 1rem;
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.12);
          color: #f4f1ec;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.95rem;
          letter-spacing: 0.04em;
          border-radius: 2px;
          margin-bottom: 1rem;
        }
        .gate-input:focus {
          outline: none;
          border-color: var(--gold);
          background: rgba(0,0,0,0.5);
        }
        .gate-submit {
          width: 100%;
          margin-top: 0.25rem;
        }
        .gate-error {
          color: #e87b6b;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.8rem;
          letter-spacing: 0.04em;
          margin: 0.75rem 0 0;
          text-transform: uppercase;
        }
        .gate-foot {
          margin-top: 1.5rem;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(244,241,236,0.45);
          text-align: center;
        }
      `}</style>
      <div className="gate-shell">
        <div className="gate-card">
          <div className="eyebrow">
            <span className="eyebrow-num">00 ·</span>
            <span className="eyebrow-line" />
            <span>Access</span>
          </div>
          <h1 className="gate-h1">
            Peak360 — <span className="gold">Restricted</span>
          </h1>
          <form action="/api/landing-gate" method="POST">
            <input type="hidden" name="next" value={next} />
            <input
              type="password"
              name="password"
              required
              autoFocus
              autoComplete="current-password"
              placeholder="Access code"
              className="gate-input"
            />
            <button type="submit" className="btn btn-gold gate-submit">
              Continue
            </button>
            {showError && <p className="gate-error">Incorrect password.</p>}
          </form>
          <p className="gate-foot">Invitation only · launching soon</p>
        </div>
      </div>
    </div>
  );
}
