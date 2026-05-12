'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

function ResetPasswordShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center pt-24 pb-12 px-4">
      <div className="w-full max-w-[360px]">
        {/* Hero — mono eyebrow above Display title */}
        <div className="text-center mb-8">
          <div className="mb-3">
            <MonoEyebrow variant="hero">PEAK360 · RECOVERY</MonoEyebrow>
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
            Recovery
          </h1>
        </div>

        {/* Form card */}
        <div className="bg-bg-3 border border-line p-6 sm:p-8 rounded-lg">
          {children}
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

function InvalidLinkState() {
  return (
    <ResetPasswordShell>
      <h2 className="text-text text-[20px] font-medium leading-tight mb-2 text-center">Invalid reset link</h2>
      <p className="text-text-dim text-[13px] text-center mb-6">
        This link is missing or invalid. Request a new password reset from the sign-in page.
      </p>
      <div className="text-center">
        <Link
          href="/login"
          className="text-[13px] text-text-dim hover:text-gold-brand transition-colors"
        >
          Back to sign in
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

  const inputClasses =
    'w-full px-4 py-3 bg-bg-3 border border-line text-text placeholder:text-text-faint text-[13px] focus:outline-none focus:border-gold-brand transition-all rounded-md';

  return (
    <ResetPasswordShell>
      <h2 className="text-text text-[20px] font-medium leading-tight mb-2 text-center">Set a new password</h2>
      <p className="text-text-dim text-[13px] text-center mb-6">
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
            className={inputClasses}
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
            className={inputClasses}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-danger text-[13px]">
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
          <div className="flex items-center gap-2 text-status-good text-[13px]">
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
          className="w-full py-3 bg-gold-brand text-bg rounded-md text-[13px] font-medium tracking-[0.02em] hover:bg-champagne transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
              Setting password…
            </span>
          ) : (
            'Reset password'
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/login"
          className="text-[13px] text-text-dim hover:text-gold-brand transition-colors"
        >
          Back to sign in
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
