'use client';

import { Navbar, type NavbarProps } from '@repo/ui';
import { Link } from '@/i18n/navigation';

export function WebNavbar(props: Omit<NavbarProps, 'Link'>) {
  return <Navbar {...props} Link={Link} />;
}
