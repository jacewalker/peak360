'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
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
        router.push('/');
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
          <h2 className="text-white text-lg font-semibold mb-1 text-center">Welcome back</h2>
          <p className="text-white/40 text-xs text-center mb-6">Enter your password to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-[10px] mt-6 tracking-wide">
          Authorised access only. All activity is monitored.
        </p>
      </div>
    </div>
  );
}
