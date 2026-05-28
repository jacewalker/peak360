// Font configuration for @react-pdf/renderer.
//
// Phase: PDF pillar redesign - the report now renders in the portal brand
// typefaces (Inter Tight + JetBrains Mono) instead of the built-in Helvetica,
// so the downloadable PDF matches the in-app /report and the home page.
//
// The TTFs in ./fonts were converted from the @fontsource woff files (latin
// subset) so they are plain sfnt that fontkit reads reliably. They are bundled
// in the repo (not a runtime dependency) and registered from an absolute path
// rooted at process.cwd() so server-side rendering (API route) resolves them
// regardless of the working directory.

import { Font } from '@react-pdf/renderer';
import path from 'node:path';

const FONT_DIR = path.join(process.cwd(), 'src/lib/pdf/fonts');
const f = (file: string) => path.join(FONT_DIR, file);

let registered = false;

/**
 * Register the brand font families. Idempotent - safe to call on every render.
 * Called once at module load below; exported so tests / scripts can re-assert.
 */
export function registerPdfFonts(): void {
  if (registered) return;

  Font.register({
    family: 'Inter Tight',
    fonts: [
      { src: f('InterTight-Light.ttf'), fontWeight: 300 },
      { src: f('InterTight-Regular.ttf'), fontWeight: 400 },
      { src: f('InterTight-Medium.ttf'), fontWeight: 500 },
      { src: f('InterTight-SemiBold.ttf'), fontWeight: 600 },
      { src: f('InterTight-Bold.ttf'), fontWeight: 700 },
    ],
  });

  Font.register({
    family: 'JetBrains Mono',
    fonts: [
      { src: f('JetBrainsMono-Regular.ttf'), fontWeight: 400 },
      { src: f('JetBrainsMono-SemiBold.ttf'), fontWeight: 600 },
      { src: f('JetBrainsMono-Bold.ttf'), fontWeight: 700 },
    ],
  });

  // Inter Tight has no hard hyphenation needs in this report; disable the
  // default hyphenation callback so words break only on real spaces.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}

registerPdfFonts();

/**
 * Font family + weight tokens. Body copy is Inter Tight; numerics, eyebrows and
 * labels are JetBrains Mono (mirrors --font-sans / --font-mono in globals.css).
 *
 * The legacy `regular` / `bold` / `italic` keys are kept (now mapped to Inter
 * Tight) so any not-yet-migrated component keeps compiling; new code should use
 * `sans` / `mono` + a `WEIGHT.*` value.
 */
export const FONT = {
  sans: 'Inter Tight',
  mono: 'JetBrains Mono',
  // legacy aliases (were Helvetica) - now brand sans
  regular: 'Inter Tight',
  bold: 'Inter Tight',
  italic: 'Inter Tight',
  boldItalic: 'Inter Tight',
} as const;

export const WEIGHT = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;
