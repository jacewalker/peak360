import Link from 'next/link';
import Image from 'next/image';
import { montserrat, openSans } from '@/lib/fonts';

export const metadata = {
  title: 'Peak360 Longevity | Coming Soon',
  description: 'Peak360 — World-class longevity testing in Geelong. Site coming soon. Coaches and clients can sign in to the portal.',
};

export default function ComingSoonPage() {
  return (
    <div className={`${montserrat.variable} ${openSans.variable} min-h-screen bg-gradient-to-b from-navy-950 via-[#0f2440] to-navy text-white relative overflow-hidden`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,166,35,0.10),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(245,166,35,0.05),transparent_60%)]" />

      <main className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
        <Link href="/" className="flex items-center gap-3 mb-12">
          <Image src="/logo.png" alt="Peak360 Logo" width={56} height={40} priority />
          <span className="font-heading text-2xl font-bold tracking-tight">
            PEAK<span className="text-gold">360</span>
          </span>
        </Link>

        <p className="font-body text-gold text-sm tracking-[0.3em] uppercase mb-6">
          World-Class Longevity Testing in Geelong
        </p>

        <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight max-w-3xl mb-8">
          Something{' '}
          <span className="bg-gradient-to-r from-gold to-yellow-300 bg-clip-text text-transparent">
            powerful
          </span>{' '}
          is coming.
        </h1>

        <p className="font-body text-lg sm:text-xl text-white/70 max-w-xl mb-12">
          Our new site is launching soon. In the meantime, coaches and clients can sign in to the portal.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/portal"
            className="font-heading font-bold text-navy bg-gold px-8 py-4 rounded-lg text-lg hover:bg-yellow-400 transition-all shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5"
          >
            Sign in to Portal
          </Link>
          <a
            href="mailto:hello@peak360.com.au"
            className="font-heading font-semibold text-white border border-white/20 px-8 py-4 rounded-lg text-lg hover:bg-white/5 transition-all"
          >
            Get in Touch
          </a>
        </div>

        <footer className="absolute bottom-8 font-body text-xs text-white/40 tracking-wide">
          &copy; {new Date().getFullYear()} Peak360 Longevity. Geelong, Australia.
        </footer>
      </main>
    </div>
  );
}
