'use client';

import { AppShell } from '@repo/ui';
import { Sidebar } from './sidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      sidebar={<Sidebar />}
      logo={
        <div className="flex items-center gap-2 font-bold text-xl text-white">
          <div className="h-8 w-8 rounded-lg bg-brand-pink flex items-center justify-center text-white">
            A
          </div>
          Admin Console
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
