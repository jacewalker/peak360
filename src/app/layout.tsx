import type { Metadata } from 'next';
import './globals.css';
import './landing.css';
import { inter, jetbrainsMono } from '@/lib/fonts';

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://peak360.com.au';
const OG_TITLE = 'Peak360 — Discover Your Peak';
const OG_DESCRIPTION =
  'World-class longevity testing in Geelong. 60+ biomarkers, on-site VO₂ Max, and a 5-tier rating system to reveal your true biological age.';
const OG_IMAGE = {
  url: '/landing/og-card.png',
  width: 1200,
  height: 630,
  alt: 'Peak360 — longevity testing in Geelong',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Peak360',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  icons: {
    icon: '/landing/peak360-logo.png',
    apple: { url: '/landing/apple-touch-icon.png', sizes: '180x180' },
  },
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
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen font-sans`}>
        {children}
      </body>
    </html>
  );
}
