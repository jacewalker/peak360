import { Montserrat, Open_Sans, Inter_Tight, JetBrains_Mono } from 'next/font/google';

export const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Phase 9: rebound to Inter Tight (variable name --font-sans preserved so Phase 8
// report + Phase 5 PDF — which reference their own typography — are unaffected).
// Export name kept as `inter` to avoid cascade rename through layout.tsx.
export const inter = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

// Phase 9: new mono family for eyebrows, meta labels, and numeric readouts.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});
