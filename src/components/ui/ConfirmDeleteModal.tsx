'use client';

import { useState, useEffect, useRef } from 'react';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  itemCount: number;
  itemLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  itemCount,
  itemLabel,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const plural = itemCount === 1 ? itemLabel : `${itemLabel}s`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.status === 401) {
        setError('Incorrect password');
        setPassword('');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError('Something went wrong');
        setLoading(false);
        return;
      }

      onConfirm();
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[rgba(10,10,11,0.7)] z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-bg-3 border border-line-2 rounded-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <MonoEyebrow variant="hero" as="div" className="mb-3 text-danger">
            DESTRUCTIVE · CONFIRM
          </MonoEyebrow>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-[20px] font-medium text-text tracking-[-0.015em]">Confirm Deletion</h3>
          </div>

          {/* Body */}
          <p className="text-[13px] text-text-dim mb-4 leading-[1.55]">
            This will permanently delete {itemCount} {plural}. This action cannot be undone.
          </p>

          {/* Password input */}
          <input
            ref={inputRef}
            type="password"
            placeholder="Enter your password to confirm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full h-12 px-4 rounded-lg border border-line bg-bg-3 text-[13px] text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors disabled:opacity-50"
          />

          {/* Error */}
          {error && (
            <p className="text-[13px] text-danger mt-2">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="text-[13px] font-medium tracking-[0.02em] text-text border border-line-2 hover:border-gold-brand hover:text-gold-brand rounded-lg px-4 py-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password || loading}
              className="text-[13px] font-medium tracking-[0.02em] text-bg bg-danger hover:opacity-90 rounded-lg px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting…' : `Delete ${itemCount} ${plural}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
