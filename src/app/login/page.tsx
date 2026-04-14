'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

type AuthMode = 'coach' | 'client';
type CoachView = 'login' | 'register';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('coach');
  const [coachView, setCoachView] = useState<CoachView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

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
        setError('Invalid email or password');
      } else {
        router.push('/portal');
        router.refresh();
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCoachRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: '/portal',
      });

      if (res.error) {
        setError(res.error.message || 'Registration failed');
      } else {
        router.push('/portal');
        router.refresh();
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setSuccess('Check your email for a login link');
      }
    } catch {
      setError('Connection error. Please try again.');
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

        {/* Mode toggle */}
        <div className="flex mb-6 bg-white/[0.05] rounded-xl p-1">
          <button
            type="button"
            onClick={() => { setMode('coach'); resetForm(); setCoachView('login'); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'coach'
                ? 'bg-[#F5A623] text-[#1a365d] shadow-sm'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Coach / Admin
          </button>
          <button
            type="button"
            onClick={() => { setMode('client'); resetForm(); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'client'
                ? 'bg-[#F5A623] text-[#1a365d] shadow-sm'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Client
          </button>
        </div>

        {/* Form card */}
        <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          {mode === 'coach' && coachView === 'login' && (
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
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setCoachView('register'); setError(''); }}
                  className="text-white/40 text-xs hover:text-white/60 transition-colors"
                >
                  Don&apos;t have an account? <span className="text-[#F5A623]/70 hover:text-[#F5A623]">Create one</span>
                </button>
              </div>
            </>
          )}

          {mode === 'coach' && coachView === 'register' && (
            <>
              <h2 className="text-white text-lg font-semibold mb-1 text-center">Create Account</h2>
              <p className="text-white/40 text-xs text-center mb-6">Register as a coach or administrator</p>

              <form onSubmit={handleCoachRegister} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    autoFocus
                    required
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/25 transition-all"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
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
                    minLength={8}
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/25 transition-all"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    minLength={8}
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
                  disabled={loading || !email || !password || !name || !confirmPassword}
                  className="w-full py-3 bg-[#F5A623] text-[#1a365d] rounded-xl font-semibold text-sm hover:bg-[#f7bc5a] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#1a365d]/30 border-t-[#1a365d] rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setCoachView('login'); setError(''); }}
                  className="text-white/40 text-xs hover:text-white/60 transition-colors"
                >
                  Already have an account? <span className="text-[#F5A623]/70 hover:text-[#F5A623]">Sign in</span>
                </button>
              </div>
            </>
          )}

          {mode === 'client' && (
            <>
              <h2 className="text-white text-lg font-semibold mb-1 text-center">Client Access</h2>
              <p className="text-white/40 text-xs text-center mb-6">
                {process.env.NODE_ENV === 'development'
                  ? 'Sign in with email and password'
                  : 'We\'ll send a login link to your email'}
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
                      'Send Login Link'
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
