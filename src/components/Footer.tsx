import React from 'react';
import { Link } from '@/navigation';
import Image from 'next/image';
import { Facebook, Twitter, Instagram, Linkedin, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0f1014] text-white border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Top Section: Logo & Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="relative w-8 h-8">
                 <Image src="/logo.svg" alt="IDEA Logo" fill className="object-contain" />
              </div>
              <span className="text-xl font-bold tracking-tight">The IDEA<span className="text-brand-yellow">.</span></span>
            </Link>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">
              Baghdad&apos;s premier digital ecosystem. Shopping, Rentals, Education, and Corporate Solutions in one unified platform.
            </p>
            <div className="flex gap-4">
              <SocialIcon icon={<Instagram size={18} />} label="Follow us on Instagram" />
              <SocialIcon icon={<Twitter size={18} />} label="Follow us on Twitter" />
              <SocialIcon icon={<Linkedin size={18} />} label="Follow us on LinkedIn" />
              <SocialIcon icon={<Facebook size={18} />} label="Follow us on Facebook" />
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-bold text-white mb-4">Shop & Play</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/megastore" className="hover:text-brand-pink transition">Megastore</Link></li>
              <li><Link href="/plus" className="hover:text-brand-pink transition">IDEA Plus</Link></li>
              <li><Link href="/megastore?filter=Games" className="hover:text-brand-pink transition">Games</Link></li>
              <li><Link href="/megastore?filter=Consoles" className="hover:text-brand-pink transition">Consoles</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/academy" className="hover:text-brand-pink transition">The Academy</Link></li>
              <li><Link href="/suite" className="hover:text-brand-pink transition">IDEA Suite (B2B)</Link></li>
              <li><Link href="/careers" className="hover:text-brand-pink transition">Careers</Link></li>
              <li><Link href="/about" className="hover:text-brand-pink transition">Our Story</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/contact" className="hover:text-brand-pink transition">Contact Us</Link></li>
              <li><Link href="/faq" className="hover:text-brand-pink transition">Help Center</Link></li>
              <li><Link href="/account" className="hover:text-brand-pink transition">My Account</Link></li>
              <li><Link href="/admin" className="hover:text-brand-pink transition">Staff Login</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/legal/terms" className="hover:text-brand-pink transition">Terms of Service</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-brand-pink transition">Privacy Policy</Link></li>
              <li><Link href="/legal/refund" className="hover:text-brand-pink transition">Refund Policy</Link></li>
            </ul>
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-8"></div>

        {/* Bottom Section: Sony Style Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          
          <div className="flex items-center gap-2">
            <Globe size={14} />
            <span>Iraq (English)</span>
          </div>

          <div className="text-center md:text-right max-w-2xl">
            <p className="mb-2">© 2026 The IDEA IQ.</p>
            <p>
              All content, games titles, trade names and/or trade dress, trademarks, artwork and associated imagery are trademarks and/or copyright material of their respective owners. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <a href="#" aria-label={label} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:bg-brand-pink hover:text-white transition-all">
      {icon}
    </a>
  );
}
