'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

type AuthMode = 'coach' | 'client';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('coach');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCoachLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await authClient.signIn.email({
        email,
        password,
        callbackURL: '/portal',
      });

      if (res.error) {
        setError('Invalid email or password. Try again or reset your password.');
      } else {
        router.push('/portal');
        router.refresh();
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reused unchanged across the coach-mode "Email me a sign-in link" button (D-26)
  // and the production client-mode magic-link form. Signature widened to accept an
  // optional event so it works from both <form onSubmit> and <button onClick>.
  const handleMagicLink = async (e?: React.SyntheticEvent) => {
    e?.preventDefault?.();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await authClient.signIn.magicLink({
        email,
        callbackURL: '/portal',
      });

      if (res.error) {
        setError(res.error.message || 'Failed to send login link');
      } else {
        setSuccess('Check your email for a sign-in link.');
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Triggers Better Auth's POST /request-password-reset endpoint (D-25).
  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (res.error) {
        setError(res.error.message || "Couldn't send reset link.");
      } else {
        setSuccess('Check your email for a password reset link.');
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  };

  const inputClasses =
    'w-full px-4 py-3 bg-bg-3 border border-line text-text placeholder:text-text-faint text-[13px] focus:outline-none focus:border-gold-brand transition-all rounded-md';

  return (
    <div className="min-h-screen flex flex-col items-center pt-24 pb-12 px-4">
      <div className="w-full max-w-[360px]">
        {/* Hero — mono eyebrow above Display title */}
        <div className="text-center mb-8">
          <div className="mb-3">
            <MonoEyebrow variant="hero">PEAK360 · ACCESS</MonoEyebrow>
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
            Sign in
          </h1>
        </div>

        {/* Form card */}
        <div className="bg-bg-3 border border-line p-6 sm:p-8 rounded-lg">
          {/* Mode toggle — segmented control */}
          <div className="bg-bg-2 border border-line p-1 mb-6 flex rounded-md">
            {(['coach', 'client'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                aria-pressed={mode === m}
                className={`flex-1 px-3 py-2 rounded text-[13px] font-medium tracking-[0.02em] transition-all ${
                  mode === m ? 'bg-bg-3 text-text' : 'text-text-dim hover:text-text'
                }`}
              >
                {m === 'coach' ? 'Coach / Admin' : 'Client'}
              </button>
            ))}
          </div>

          {mode === 'coach' && (
            <>
              <p className="text-text-dim text-[13px] text-center mb-6">Sign in with your email and password.</p>

              <form onSubmit={handleCoachLogin} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    autoFocus
                    required
                    className={inputClasses}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className={inputClasses}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-danger text-[13px]">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 text-status-good text-[13px]">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{success}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full py-3 bg-gold-brand text-bg rounded-md text-[13px] font-medium tracking-[0.02em] hover:bg-champagne transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>

                {/* Forgot password? */}
                <div className="mt-3 text-right">
                  <button
                    type="button"
                    disabled={loading || !email}
                    onClick={handleForgotPassword}
                    className="text-[13px] text-text-dim hover:text-gold-brand transition-colors disabled:opacity-40"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* OR divider */}
                <div className="flex items-center gap-3 my-4">
                  <span className="flex-1 h-px bg-line" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">OR</span>
                  <span className="flex-1 h-px bg-line" />
                </div>

                {/* Email me a sign-in link — ghost CTA */}
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={loading || !email}
                  className="w-full py-3 bg-transparent border border-line-2 text-text rounded-md text-[13px] font-medium tracking-[0.02em] hover:border-gold-brand hover:text-gold-brand transition-all disabled:opacity-40"
                >
                  Email me a sign-in link
                </button>
              </form>
            </>
          )}

          {mode === 'client' && (
            <>
              <p className="text-text-dim text-[13px] text-center mb-6">
                Sign in to your client portal.
              </p>

              {process.env.NODE_ENV === 'development' ? (
                <form onSubmit={handleCoachLogin} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      autoFocus
                      required
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className={inputClasses}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-danger text-[13px]">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="w-full py-3 bg-gold-brand text-bg rounded-md text-[13px] font-medium tracking-[0.02em] hover:bg-champagne transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                        Signing in…
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </button>

                  <p className="text-text-faint text-[11px] text-center font-mono uppercase tracking-[0.16em]">Dev mode: password login enabled</p>
                </form>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      autoFocus
                      required
                      className={inputClasses}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-danger text-[13px]">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 text-status-good text-[13px]">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{success}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email || !!success}
                    className="w-full py-3 bg-gold-brand text-bg rounded-md text-[13px] font-medium tracking-[0.02em] hover:bg-champagne transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                        Sending link…
                      </span>
                    ) : (
                      'Send sign-in link'
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer — mono uppercase */}
        <p className="text-center mt-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold-brand">
            AUTHORISED ACCESS ONLY · ACTIVITY MONITORED
          </span>
        </p>
      </div>
    </div>
  );
}
