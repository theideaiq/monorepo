import { cn } from '@repo/utils';
import { Globe } from 'lucide-react';
import type React from 'react';
import { buttonVariants } from '../../button/Button';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterProps {
  brand: {
    logo: React.ReactNode;
    description: string;
    socials: React.ReactNode;
  };
  columns: FooterColumn[];
  copyright: {
    text: string;
    rights: string;
    location: string;
  };
  /** Link component injection */
  Link: React.ComponentType<{
    href: string;
    children: React.ReactNode;
    className?: string;
  }>;
}

/**
 * Global Footer Component.
 * Responsive multi-column layout with social links and copyright.
 */
export function Footer({ brand, columns, copyright, Link }: FooterProps) {
  return (
    <footer className="bg-brand-deep text-white border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Section: Logo & Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">{brand.logo}</div>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">
              {brand.description}
            </p>
            <div className="flex gap-4">{brand.socials}</div>
          </div>

          {/* Links Columns */}
          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="font-bold text-white mb-4">{column.title}</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="hover:text-brand-pink transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-8" />

        {/* Bottom Section: Sony Style Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Globe size={14} />
            <span>{copyright.location}</span>
          </div>

          <div className="text-center md:text-right max-w-2xl">
            <p className="mb-2">{copyright.text}</p>
            <p>{copyright.rights}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * Helper component for rendering social media icons.
 */
export function SocialIcon({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'w-8 h-8 bg-white/5 rounded-full text-slate-400 hover:bg-brand-pink hover:text-white transition-all',
      )}
    >
      {icon}
    </a>
  );
}
