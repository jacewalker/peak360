import type { Metadata } from 'next';
import './globals.css';
import './landing.css';
import { inter } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Peak360 — Discover Your True Health Age',
  description:
    'World-class longevity testing in Geelong. 60+ biomarkers, on-site VO₂ Max, and a 5-tier rating system to reveal your true biological age.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className={`${inter.variable} antialiased min-h-screen bg-background font-sans`}>
        {children}
      </body>
    </html>
  );
}
