'use client';

import { Sheet, SheetContent, SheetTrigger } from '@repo/ui';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Sidebar } from './sidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:m-4 focus:block focus:rounded-md focus:bg-background focus:p-4 focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar - hidden on mobile, visible on md+ */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <Sidebar className="h-full border-r-0" />
      </aside>

      {/* Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header - visible on mobile, hidden on md+ */}
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <Sidebar
                onLinkClick={() => setOpen(false)}
                className="h-full border-r-0"
              />
            </SheetContent>
          </Sheet>
          <div className="font-semibold text-lg">Admin Console</div>
        </header>

        {/* Main Content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-muted/10 p-4 sm:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
