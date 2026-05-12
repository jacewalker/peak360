import Link from 'next/link';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  breadcrumb: string;
  eyebrow?: string;
}

export default function AdminPageHeader({ title, description, breadcrumb, eyebrow }: AdminPageHeaderProps) {
  const eyebrowText = eyebrow ?? `ADMIN · ${breadcrumb.toUpperCase()}`;

  return (
    <header className="pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Link
          href="/portal/admin"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint hover:text-gold-brand mb-4 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          ADMIN
        </Link>
        <MonoEyebrow variant="hero" as="div" className="mb-3">
          {eyebrowText}
        </MonoEyebrow>
        <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-[13px] text-text-dim leading-[1.55] max-w-2xl">{description}</p>
        )}
      </div>
    </header>
  );
}
