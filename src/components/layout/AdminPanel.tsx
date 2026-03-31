'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ADMIN_SECTIONS = [
  {
    label: 'Normative Ranges',
    href: '/admin/normative',
    description: 'Manage rating thresholds',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
  },
];

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function AdminPanel({ open, onClose }: AdminPanelProps) {
  const pathname = usePathname();

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Close on navigation
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute bottom-16 left-3 z-50 w-72 rounded-xl bg-navy shadow-2xl border border-white/10 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-3">
          Admin
        </p>

        <div className="grid grid-cols-2 gap-3">
          {ADMIN_SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="flex flex-col items-center gap-2 rounded-lg border border-white/10 px-3 py-4 text-center transition-all duration-150 hover:bg-white/8 group"
            >
              <span className="text-white/40 group-hover:text-gold transition-colors">
                {section.icon}
              </span>
              <span className="text-xs font-medium text-white/90">
                {section.label}
              </span>
              <span className="text-[10px] text-white/30 leading-tight">
                {section.description}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
