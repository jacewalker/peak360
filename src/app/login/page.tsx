'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

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
  // Better Auth v1.6+ exposes this as `authClient.requestPasswordReset`
  // (previously `authClient.forgetPassword` in older versions).
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f2440] via-[#1a365d] to-[#2d5986]" />

      {/* Subtle decorative elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.04]" style={{
        background: 'radial-gradient(circle at 60% 40%, #F5A623 0%, transparent 50%)',
      }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-[0.03]" style={{
        background: 'radial-gradient(circle at 40% 60%, #F5A623 0%, transparent 50%)',
      }} />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo + branding */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Peak360"
            className="h-21 w-auto mx-auto mb-4 drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]"
          />
          <div className="h-[2px] w-12 bg-[#F5A623] mx-auto rounded-full mb-3" />
          <p className="text-xs tracking-[0.25em] uppercase text-white/40 font-medium">
            Longevity Assessment Platform
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          {/* Mode toggle (D-27) — segmented control, default Coach / Admin */}
          <div className="bg-white/[0.05] rounded-xl p-1 mb-6 flex">
            {(['coach', 'client'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                aria-pressed={mode === m}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
                  mode === m ? 'bg-white/[0.1] text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {m === 'coach' ? 'Coach / Admin' : 'Client'}
              </button>
            ))}
          </div>

          {mode === 'coach' && (
            <>
              <h2 className="text-white text-lg font-semibold mb-1 text-center">Welcome back</h2>
              <p className="text-white/40 text-xs text-center mb-6">Sign in with your email and password</p>

              <form onSubmit={handleCoachLogin} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    autoFocus
                    required
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/25 transition-all"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/25 transition-all"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 text-green-400 text-xs">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{success}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full py-3 bg-[#F5A623] text-[#1a365d] rounded-xl font-semibold text-sm hover:bg-[#f7bc5a] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#1a365d]/30 border-t-[#1a365d] rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>

                {/* Forgot password? — D-25 */}
                <div className="mt-3 text-right">
                  <button
                    type="button"
                    disabled={loading || !email}
                    onClick={handleForgotPassword}
                    className="text-xs text-white/60 hover:text-gold transition-colors disabled:opacity-40"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* OR divider */}
                <div className="flex items-center gap-3 my-4">
                  <span className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">OR</span>
                  <span className="flex-1 h-px bg-white/10" />
                </div>

                {/* Email me a sign-in link — D-26, always shown regardless of NODE_ENV */}
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={loading || !email}
                  className="w-full py-3 bg-transparent border border-white/20 text-white rounded-xl font-semibold text-sm hover:border-gold hover:text-gold transition-all disabled:opacity-40"
                >
                  Email me a sign-in link
                </button>
              </form>
            </>
          )}

          {mode === 'client' && (
            <>
              <h2 className="text-white text-lg font-semibold mb-1 text-center">Client access</h2>
              <p className="text-white/40 text-xs text-center mb-6">
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
                      className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/25 transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/25 transition-all"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="w-full py-3 bg-[#F5A623] text-[#1a365d] rounded-xl font-semibold text-sm hover:bg-[#f7bc5a] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-[#1a365d]/30 border-t-[#1a365d] rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </button>

                  <p className="text-amber-400/60 text-[10px] text-center">Dev mode: password login enabled</p>
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
                      className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/25 transition-all"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 text-green-400 text-xs">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{success}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email || !!success}
                    className="w-full py-3 bg-[#F5A623] text-[#1a365d] rounded-xl font-semibold text-sm hover:bg-[#f7bc5a] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-[#1a365d]/30 border-t-[#1a365d] rounded-full animate-spin" />
                        Sending link...
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

        {/* Footer */}
        <p className="text-center text-white/20 text-[10px] mt-6 tracking-wide">
          Authorised access only. All activity is monitored.
        </p>
      </div>
    </div>
  );
}
