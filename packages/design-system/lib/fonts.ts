import { cn } from '@repo/design-system/lib/utils';
import { GeistMono } from 'geist/font/mono';
import { Cairo, Readex_Pro } from 'next/font/google';

// The IDEA's brand fonts (docs/brand/DESIGN_SYSTEM.md, section 2.2): Readex
// Pro for Arabic and Latin alike, Cairo as the Arabic fallback, Geist Mono
// for prices and order numbers. The stack is --font-sans in
// styles/globals.css.
const readex = Readex_Pro({
  display: 'swap',
  subsets: ['latin', 'arabic'],
  variable: '--font-readex',
  weight: ['400', '500', '600', '700'],
});

const arabic = Cairo({
  display: 'swap',
  preload: false,
  subsets: ['arabic'],
  variable: '--font-arabic',
  weight: ['400', '500', '600', '700'],
});

export const fonts = cn(
  readex.variable,
  arabic.variable,
  GeistMono.variable,
  'touch-manipulation font-sans antialiased'
);
