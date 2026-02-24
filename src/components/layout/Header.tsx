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
        <button
          onClick={() => {
            document.cookie = 'peak360_session=; Path=/; Max-Age=0';
            window.location.href = '/login';
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}
