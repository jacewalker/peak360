import type { Metadata } from 'next';
import './globals.css';
import { inter } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Peak360 Longevity Assessment',
  description: 'Complete longevity assessment platform covering body composition, cardiovascular fitness, strength, mobility, and biomarkers.',
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
      </head>
      <body className={`${inter.variable} antialiased min-h-screen bg-background font-sans`}>
        {children}
      </body>
    </html>
  );
}
