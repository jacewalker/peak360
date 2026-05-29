'use client';

import Link from 'next/link';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

const ADMIN_SECTIONS = [
  {
    label: 'Normative Ranges',
    href: '/portal/admin/normative',
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
  {
    label: 'Marker Content',
    href: '/portal/admin/marker-content',
    description:
      'Author definitions, impact, and per-tier per-gender coach insights for every marker shown in the report detail panels.',
    stat: '98 markers',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        />
      </svg>
    ),
  },
  {
    label: 'Markers',
    href: '/portal/admin/markers',
    description:
      'Add or remove markers from any assessment section. Configure pillar, normative ranges, and AI extraction aliases.',
    stat: 'Registry',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4.5v15m7.5-7.5h-15"
        />
        <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Audit Logs',
    href: '/portal/admin/audit-logs',
    description:
      'View security event logs for all system actions — assessment views, section edits, file uploads, and more.',
    stat: 'Security',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
        />
      </svg>
    ),
  },
  {
    label: 'People',
    href: '/portal/admin/users',
    description:
      'Admins, coaches, and clients — all in one place. Create users and manage roles.',
    stat: 'People',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
  },
];

export default function AdminHomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <MonoEyebrow variant="hero" as="div" className="mb-3">
            ADMIN · CONTROL
          </MonoEyebrow>
          <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
            Administration
          </h1>
          <p className="mt-3 text-[13px] text-text-dim leading-[1.55] max-w-2xl">
            Configure normative data, manage system settings, and control platform behaviour.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <MonoEyebrow variant="meta" as="div" className="mb-6">
          ADMIN · SECTIONS
        </MonoEyebrow>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADMIN_SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group relative bg-bg-3 rounded-2xl border border-line p-6 hover:border-gold-brand/40 transition-colors duration-200 flex flex-col gap-5"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-bg-2 border border-line flex items-center justify-center text-text-dim group-hover:bg-gold-brand/10 group-hover:border-gold-brand/30 group-hover:text-gold-brand transition-all duration-200">
                  {section.icon}
                </div>
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] px-2.5 py-1 rounded-full bg-bg-2 text-text-faint border border-line">
                  {section.stat}
                </span>
              </div>

              <div className="flex-1">
                <h3 className="text-[20px] font-medium text-text tracking-[-0.015em] mb-1.5">{section.label}</h3>
                <p className="text-[13px] text-text-dim leading-[1.55]">{section.description}</p>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-transparent group-hover:text-gold-brand transition-all duration-200">
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

          <div className="rounded-2xl border border-dashed border-line bg-bg-3/40 p-6 flex flex-col gap-5 min-h-[200px]">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-bg-2 border border-line flex items-center justify-center text-text-faint">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              </div>
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] px-2.5 py-1 rounded-full bg-bg-2 text-text-faint border border-line">
                Coming Soon
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-[20px] font-medium text-text-faint tracking-[-0.015em] mb-1.5">Spot Integration</h3>
              <p className="text-[13px] text-text-faint leading-[1.55]">Connect and sync data with Spot for streamlined client management and automated workflows.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-line bg-bg-3/40 p-6 flex flex-col gap-5 min-h-[200px]">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-bg-2 border border-line flex items-center justify-center text-text-faint">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] px-2.5 py-1 rounded-full bg-bg-2 text-text-faint border border-line">
                Coming Soon
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-[20px] font-medium text-text-faint tracking-[-0.015em] mb-1.5">Vald Performance Integration</h3>
              <p className="text-[13px] text-text-faint leading-[1.55]">Sync ForceDecks force plate data directly into assessments for objective strength and power measurements.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-line bg-bg-3/40 p-6 flex flex-col items-center justify-center gap-3 min-h-[200px] text-center">
            <div className="w-10 h-10 rounded-full bg-line flex items-center justify-center">
              <svg className="w-5 h-5 text-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <p className="text-[13px] text-text-faint font-medium">More sections coming soon</p>
          </div>
        </div>
      </main>
    </div>
  );
}
