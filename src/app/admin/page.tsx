'use client';

import Link from 'next/link';

const ADMIN_SECTIONS = [
  {
    label: 'Normative Ranges',
    href: '/admin/normative',
    description:
      'Manage rating thresholds for all biomarkers and fitness tests across all 5 tiers — poor, cautious, normal, great, and elite.',
    stat: '63 markers',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
        />
      </svg>
    ),
  },
];

export default function AdminHomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div
        className="relative overflow-hidden"
        style={{
          backgroundColor: '#0f2440',
          backgroundImage: `radial-gradient(circle, rgba(245,166,35,0.07) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      >
        <div className="relative px-8 py-14">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              Peak360
            </span>
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
              Administration
            </span>
          </div>

          <h1 className="text-[2.75rem] font-black text-white tracking-tight leading-none mb-3">
            Administration
          </h1>
          <p className="text-white/40 text-sm max-w-md leading-relaxed">
            Configure normative data, manage system settings, and control platform behaviour.
          </p>
        </div>

        {/* Gold accent line */}
        <div className="h-px w-full bg-gradient-to-r from-gold/60 via-gold/20 to-transparent" />
      </div>

      {/* Card Grid */}
      <div className="px-8 py-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-6">
          Admin Sections
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
          {ADMIN_SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group relative bg-surface rounded-2xl border border-border p-6 shadow-sm hover:shadow-lg hover:border-gold/40 transition-all duration-200 flex flex-col gap-5"
            >
              {/* Icon + stat */}
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-navy/5 border border-navy/10 flex items-center justify-center text-navy/60 group-hover:bg-gold/8 group-hover:border-gold/20 group-hover:text-gold transition-all duration-200">
                  {section.icon}
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-navy/5 text-navy/50 border border-navy/8">
                  {section.stat}
                </span>
              </div>

              {/* Label + description */}
              <div className="flex-1">
                <h3 className="font-bold text-navy text-base mb-1.5">{section.label}</h3>
                <p className="text-sm text-muted leading-relaxed">{section.description}</p>
              </div>

              {/* Manage arrow — reveals on hover */}
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-transparent group-hover:text-gold transition-all duration-200">
                <span>Manage</span>
                <svg
                  className="w-3.5 h-3.5 -translate-x-1 group-hover:translate-x-0 transition-transform duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>
          ))}

          {/* User Management — coming soon */}
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 flex flex-col gap-5 min-h-[200px]">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-navy/5 border border-navy/10 flex items-center justify-center text-navy/30">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-navy/5 text-navy/30 border border-navy/8">
                Coming Soon
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-navy/40 text-base mb-1.5">User Management</h3>
              <p className="text-sm text-muted/50 leading-relaxed">Create coach and client accounts, link users to existing clients, and enable clients to securely log in and view their own assessment data.</p>
            </div>
          </div>

          {/* Spot Integration — coming soon */}
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 flex flex-col gap-5 min-h-[200px]">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-navy/5 border border-navy/10 flex items-center justify-center text-navy/30">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-navy/5 text-navy/30 border border-navy/8">
                Coming Soon
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-navy/40 text-base mb-1.5">Spot Integration</h3>
              <p className="text-sm text-muted/50 leading-relaxed">Connect and sync data with Spot for streamlined client management and automated workflows.</p>
            </div>
          </div>

          {/* Vald Performance Integration — coming soon */}
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 flex flex-col gap-5 min-h-[200px]">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-navy/5 border border-navy/10 flex items-center justify-center text-navy/30">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-navy/5 text-navy/30 border border-navy/8">
                Coming Soon
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-navy/40 text-base mb-1.5">Vald Performance Integration</h3>
              <p className="text-sm text-muted/50 leading-relaxed">Sync ForceDecks force plate data directly into assessments for objective strength and power measurements.</p>
            </div>
          </div>

          {/* Generic coming soon placeholder */}
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 flex flex-col items-center justify-center gap-3 min-h-[200px] text-center">
            <div className="w-10 h-10 rounded-full bg-border/60 flex items-center justify-center">
              <svg className="w-5 h-5 text-muted/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <p className="text-xs text-muted/50 font-medium">More sections coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
