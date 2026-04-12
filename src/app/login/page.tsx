'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClientMode = searchParams.get('mode') === 'client';

  // Check if already logged in
  const { data: sessionData } = authClient.useSession();
  useEffect(() => {
    if (sessionData?.session) {
      router.push('/portal');
    }
  }, [sessionData, router]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/portal');
        router.refresh();
      } else {
        setError('Incorrect password');
        setPassword('');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);

    try {
      await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL: '/portal',
      });
      setMagicLinkSent(true);
    } catch {
      setError('Failed to send login link. Please try again.');
    } finally {
      setLoading(false);
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
          {isClientMode ? (
            // Magic link login for clients
            magicLinkSent ? (
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <h2 className="text-white text-lg font-semibold mb-1">Check your email</h2>
                <p className="text-white/50 text-sm">
                  We sent a login link to <span className="text-white/70">{email}</span>. Click the link in your email to sign in.
                </p>
                <button
                  onClick={() => { setMagicLinkSent(false); setEmail(''); }}
                  className="mt-4 text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-white text-lg font-semibold mb-1 text-center">Welcome to Peak360</h2>
                <p className="text-white/40 text-xs text-center mb-6">Enter your email to receive a login link</p>

                <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
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

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full py-3 bg-[#F5A623] text-[#1a365d] rounded-xl font-semibold text-sm hover:bg-[#f7bc5a] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-[#1a365d]/30 border-t-[#1a365d] rounded-full animate-spin" />
                        Sending link...
                      </span>
                    ) : (
                      'Send Login Link'
                    )}
                  </button>
                </form>
              </>
            )
          ) : (
            // Password login for coaches/admins
            <>
              <h2 className="text-white text-lg font-semibold mb-1 text-center">Welcome back</h2>
              <p className="text-white/40 text-xs text-center mb-6">Enter your password to continue</p>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
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

                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full py-3 bg-[#F5A623] text-[#1a365d] rounded-xl font-semibold text-sm hover:bg-[#f7bc5a] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#1a365d]/30 border-t-[#1a365d] rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Mode toggle */}
        <div className="text-center mt-4">
          {isClientMode ? (
            <a href="/login" className="text-white/30 text-xs hover:text-white/50 transition-colors">
              Coach login
            </a>
          ) : (
            <a href="/login?mode=client" className="text-white/30 text-xs hover:text-white/50 transition-colors">
              Client login (magic link)
            </a>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-[10px] mt-4 tracking-wide">
          Authorised access only. All activity is monitored.
        </p>
      </div>
    </div>
  );
}
