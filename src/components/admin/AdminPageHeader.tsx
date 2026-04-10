import Link from 'next/link';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  breadcrumb: string;
}

export default function AdminPageHeader({ title, description, breadcrumb }: AdminPageHeaderProps) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        backgroundColor: '#0f2440',
        backgroundImage: `radial-gradient(circle, rgba(245,166,35,0.07) 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
      }}
    >
      <div className="relative px-8 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-4">
          <Link
            href="/admin"
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-gold/70 transition-colors"
          >
            Administration
          </Link>
          <svg
            className="w-3 h-3 text-white/20"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold/70">
            {breadcrumb}
          </span>
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-white/40 text-sm max-w-md leading-relaxed">{description}</p>
        )}
      </div>

      {/* Gold accent line */}
      <div className="h-px w-full bg-gradient-to-r from-gold/60 via-gold/20 to-transparent" />
    </div>
  );
}
