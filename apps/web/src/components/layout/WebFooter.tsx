'use client';

import { Link } from '@/i18n/navigation';
import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import Image from 'next/image';

interface WebFooterProps {
  brand: {
    logo: React.ReactNode;
    description: string;
    socials: React.ReactNode;
  };
  columns: {
    title: string;
    links: { label: string; href: string }[];
  }[];
  copyright: {
    text: string;
    rights: string;
    location: string;
  };
}

export function WebFooter({ columns, copyright }: WebFooterProps) {
  return (
    <footer className="bg-[#0a0a0a] border-t border-white/5 pt-20 pb-10 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="relative w-8 h-8">
                <Image
                  src="/icon.svg"
                  alt="IDEA"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-black text-white tracking-tighter">
                IDEA<span className="text-brand-yellow">.</span>
              </span>
            </Link>
            <p className="mb-6 max-w-xs leading-relaxed text-slate-500">
              Innovation for Every Aspect of Life. Bringing premium technology,
              entertainment, and services to Baghdad and beyond.
            </p>
            <div className="flex gap-4">
              <SocialLink href="#" icon={<Instagram size={18} />} />
              <SocialLink href="#" icon={<Twitter size={18} />} />
              <SocialLink href="#" icon={<Linkedin size={18} />} />
              <SocialLink href="#" icon={<Facebook size={18} />} />
            </div>
          </div>

          {/* Links Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-xs">
                {col.title}
              </h4>
              <ul className="space-y-4">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="hover:text-brand-yellow transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>
            {copyright.text} &copy; {new Date().getFullYear()}{' '}
            {copyright.rights}
          </p>
          <div className="flex gap-6">
            <span>{copyright.location}</span>
            <Link href="/legal/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-yellow hover:text-black transition-all"
    >
      {icon}
    </a>
  );
}
