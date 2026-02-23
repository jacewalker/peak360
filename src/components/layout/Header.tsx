'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-navy-dark via-navy to-navy-light text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="Peak360 Logo"
            width={48}
            height={32}
            className="group-hover:scale-105 transition-transform"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight">PEAK<span className="text-gold">360</span></h1>
            <p className="text-[11px] text-white/60 tracking-widest uppercase">Longevity Assessment</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
