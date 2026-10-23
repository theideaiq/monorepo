import { cn } from '@repo/design-system/lib/utils';
import { GeistMono } from 'geist/font/mono';
import { Cairo, Poppins } from 'next/font/google';

// The IDEA's brand fonts: Poppins for Latin text, Cairo for Arabic (Poppins
// has no Arabic glyphs, so Arabic falls through to Cairo via --font-sans in
// styles/globals.css).
const latin = Poppins({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-latin',
  weight: ['400', '500', '600', '700'],
});

const arabic = Cairo({
  display: 'swap',
  subsets: ['arabic'],
  variable: '--font-arabic',
  weight: ['400', '500', '600', '700'],
});

export const fonts = cn(
  latin.variable,
  GeistMono.variable,
  arabic.variable,
  'touch-manipulation font-sans antialiased'
);
