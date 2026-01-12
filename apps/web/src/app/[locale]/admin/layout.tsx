'use client';

import { createClient } from '@supabase/supabase-js';
import {
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';

// CHANGE TO YOUR ADMIN EMAIL
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

const supabase = createClient(
  // biome-ignore lint/style/noNonNullAssertion: migration
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // biome-ignore lint/style/noNonNullAssertion: migration
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) {
        setAuthorized(false);
      } else {
        setAuthorized(true);
      }
      setLoading(false);
    }
    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <PageLoader />;

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-4">
        <ShieldAlert className="w-24 h-24 text-red-500 mb-6" />
        <h1 className="text-3xl font-bold text-brand-dark mb-2">
          Restricted Area
        </h1>
        <Button onClick={() => router.push('/')} variant="dark">
          Exit
        </Button>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} /> },
    {
      name: 'Rentals & Orders',
      href: '/admin/rentals',
      icon: <Truck size={20} />,
    },
    {
      name: 'Store Inventory',
      href: '/admin/store',
      icon: <ShoppingBag size={20} />,
    },
    { name: 'User Database', href: '/admin/users', icon: <Users size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-brand-dark text-white hidden md:flex flex-col fixed h-full inset-y-0 z-50">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-black tracking-tighter">
            IDEA<span className="text-brand-yellow">.</span>{' '}
            <span className="text-xs font-normal text-slate-400 block mt-1">
              COMMAND CENTER
            </span>
          </h2>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-brand-pink text-white font-bold shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  {item.icon}
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 w-full transition-colors"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-24 md:pt-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
