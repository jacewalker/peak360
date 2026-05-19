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
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authClient.signIn.email({
        email,
        password,
        callbackURL: '/portal',
      });

      if (res.error) {
        setError('Invalid email or password.');
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
                onClick={() => { setMode(m); setError(''); }}
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

              <form onSubmit={handleLogin} className="space-y-4">
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

                {/* Forgot password — static helper, no email send */}
                <p className="mt-3 text-center text-[13px] text-text-dim">
                  Forgot password? Speak to an admin at{' '}
                  <a
                    href="mailto:info@strongbodies.com.au"
                    className="text-gold-brand hover:underline"
                  >
                    info@strongbodies.com.au
                  </a>
                  .
                </p>
              </form>
            </>
          )}

          {mode === 'client' && (
            <div className="py-10 text-center space-y-3">
              <MonoEyebrow as="div">CLIENT PORTAL</MonoEyebrow>
              <h2 className="text-[20px] font-medium text-text tracking-[-0.015em]">
                Coming soon
              </h2>
              <p className="text-[13px] text-text-dim leading-[1.55] max-w-[280px] mx-auto">
                Client sign-in isn&apos;t available yet. Your coach will let you know when it&apos;s ready.
              </p>
            </div>
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
