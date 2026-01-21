'use client';

import { Footer, type FooterProps } from '@repo/ui';
import { Link } from '@/i18n/navigation';

export function WebFooter(props: Omit<FooterProps, 'Link'>) {
  return <Footer {...props} Link={Link} />;
}
