'use client';

import { cn } from '@repo/utils';
import { Menu, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Button } from '../../button/Button';

export interface NavItem {
  label: string;
  href: string;
}

export interface NavbarProps {
  logo: React.ReactNode;
  navItems: NavItem[];
  desktopActions?: React.ReactNode;
  mobileActions?: React.ReactNode;
  labels: {
    menuOpen: string;
    menuClose: string;
  };
  /**
   * Component to use for links (e.g. Next.js Link).
   * Injected to keep the UI package framework-agnostic.
   */
  Link: React.ComponentType<{
    href: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }>;
}

/**
 * Responsive Navbar component with mobile menu toggle.
 * Uses dependency injection for the Link component to remain framework-agnostic.
 */
export function Navbar({
  logo,
  navItems,
  desktopActions,
  mobileActions,
  labels,
  Link,
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Shared classes
  const navLinkClasses = cn(
    'text-slate-600 hover:text-brand-pink font-medium transition',
    'focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 rounded-md outline-none px-3 py-2',
  );

  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">{logo}</div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClasses}>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-2">
            {desktopActions}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-700 h-11 w-11 rounded-lg hover:bg-slate-100"
              aria-label={isOpen ? labels.menuClose : labels.menuOpen}
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 h-[calc(100vh-80px)] overflow-y-auto">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="block py-4 text-lg text-slate-900 font-bold border-b border-slate-50 hover:text-brand-pink transition-colors"
              >
                {item.label}
              </Link>
            ))}

            <div className="pt-6">{mobileActions}</div>
          </div>
        </div>
      )}
    </nav>
  );
}
