// Font configuration for @react-pdf/renderer
// Using built-in Helvetica family (regular, bold, oblique)
// No Font.register() calls needed for built-in fonts.
//
// Available font families:
//   'Helvetica'        - regular weight
//   'Helvetica-Bold'   - bold weight
//   'Helvetica-Oblique' - italic
//   'Helvetica-BoldOblique' - bold italic
//
// If a custom font (e.g. Inter) is desired in the future, register it here:
// import { Font } from '@react-pdf/renderer';
// Font.register({ family: 'Inter', src: '/path/to/Inter-Regular.ttf' });

export const FONT = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
  boldItalic: 'Helvetica-BoldOblique',
} as const;
