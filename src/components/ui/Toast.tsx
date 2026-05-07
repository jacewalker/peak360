'use client';

import { useEffect } from 'react';

export type ToastVariant = 'success' | 'error';

type ToastProps = {
  variant: ToastVariant;
  message: string;
  onDismiss: () => void;
};

/**
 * Hand-rolled toast (UI-SPEC §Component Inventory — explicit instruction:
 * "Do NOT install a toast library for two toasts; one component is enough.").
 *
 * - Fixed bottom-right
 * - 3-second auto-dismiss
 * - Gold left border for success, red for error
 * - role="status" for success, role="alert" for error (a11y)
 */
export default function Toast({ variant, message, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const borderColor = variant === 'success' ? 'border-l-4 border-gold' : 'border-l-4 border-red-500';
  const role = variant === 'success' ? 'status' : 'alert';

  return (
    <div
      role={role}
      className={`fixed bottom-6 right-6 z-50 bg-white px-4 py-3 rounded-lg shadow-lg ${borderColor} text-sm text-navy max-w-sm`}
    >
      {message}
    </div>
  );
}
