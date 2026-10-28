import { cn } from '@repo/design-system/lib/utils';
import { GeistMono } from 'geist/font/mono';
import { Alexandria } from 'next/font/google';

// The IDEA's brand fonts (docs/brand/DESIGN_SYSTEM.md, section 2.2):
// Alexandria for Arabic and Latin alike (it has گ, چ, پ, ژ and ڤ, which
// Readex Pro lacked), Geist Mono for prices, Bulbs and order numbers. The
// stack is --font-sans in styles/globals.css. The logo's wordmark is an
// outlined drawing and never uses these.
const alexandria = Alexandria({
  display: 'swap',
  subsets: ['latin', 'arabic'],
  variable: '--font-alexandria',
  weight: ['400', '500', '600', '700'],
});

export const fonts = cn(
  alexandria.variable,
  GeistMono.variable,
  'touch-manipulation font-sans antialiased'
);
