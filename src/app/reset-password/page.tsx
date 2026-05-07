'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

function ResetPasswordShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f2440] via-[#1a365d] to-[#2d5986]" />

      {/* Subtle decorative elements (verbatim from /login) */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle at 60% 40%, #F5A623 0%, transparent 50%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-[0.03]"
        style={{
          background: 'radial-gradient(circle at 40% 60%, #F5A623 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo + branding (verbatim from /login lines ~128-138) */}
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

        {/* Glass card */}
        <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          {children}
        </div>

        {/* Footer (verbatim from /login) */}
        <p className="text-center text-white/20 text-[10px] mt-6 tracking-wide">
          Authorised access only. All activity is monitored.
        </p>
      </div>
    </div>
  );
}

function InvalidLinkState() {
  return (
    <ResetPasswordShell>
      <h2 className="text-white text-lg font-semibold mb-1 text-center">Invalid reset link</h2>
      <p className="text-white/40 text-xs text-center mb-6">
        This link is missing or invalid. Request a new password reset from the sign-in page.
      </p>
      <div className="text-center">
        <Link
          href="/login"
          className="text-white/40 text-xs hover:text-white/60 transition-colors"
        >
          <span className="text-[#F5A623]/70 hover:text-[#F5A623]">Back to sign in</span>
        </Link>
      </div>
    </ResetPasswordShell>
  );
}

function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    try {
      const res = await authClient.resetPassword({ newPassword: password, token });

      if (res.error) {
        setError('This reset link has expired. Request a new one from the sign-in page.');
        setLoading(false);
        return;
      }

      // Success per D-24: show confirmation, auto-redirect to /login after 1.5s
      setSuccess('Password updated. Redirecting you to sign in…');
      setTimeout(() => router.push('/login'), 1500);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <ResetPasswordShell>
      <h2 className="text-white text-lg font-semibold mb-1 text-center">Set a new password</h2>
      <p className="text-white/40 text-xs text-center mb-6">
        Choose a strong password to secure your account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min. 8 characters)"
            autoFocus
            required
            minLength={8}
            disabled={!!success}
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/25 transition-all"
          />
        </div>
        <div>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            required
            minLength={8}
            disabled={!!success}
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/25 transition-all"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs mt-3">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-400 text-xs mt-3">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !!success || !password || !confirm}
          className="w-full py-3 bg-[#F5A623] text-[#1a365d] rounded-xl font-semibold text-sm hover:bg-[#F5A623]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-[#1a365d]/30 border-t-[#1a365d] rounded-full animate-spin" />
              Setting password...
            </span>
          ) : (
            'Set new password'
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/login"
          className="text-white/40 text-xs hover:text-white/60 transition-colors"
        >
          <span className="text-[#F5A623]/70 hover:text-[#F5A623]">Back to sign in</span>
        </Link>
      </div>
    </ResetPasswordShell>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return <InvalidLinkState />;
  }

  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage() {
  // Suspense wrapper required for useSearchParams() in Next.js App Router.
  return (
    <Suspense fallback={<ResetPasswordShell>{null}</ResetPasswordShell>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
