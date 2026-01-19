import { cn } from '@repo/utils';
import { Menu } from 'lucide-react';
import type React from 'react';
import { Button } from '../button/Button';
import { Sheet, SheetContent, SheetTrigger } from '../sheet/Sheet';

interface AppShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  userNav?: React.ReactNode;
  logo?: React.ReactNode;
  className?: string;
}

export function AppShell({
  children,
  sidebar,
  userNav,
  logo,
  className,
}: AppShellProps) {
  return (
    <div className={cn('flex min-h-screen bg-slate-50', className)}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:m-4 focus:block focus:rounded-md focus:bg-white focus:p-4 focus:text-slate-900 focus:shadow-lg focus:ring-2 focus:ring-brand-pink"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-brand-deep text-white lg:flex">
        {logo && (
          <div className="flex h-16 items-center px-6 border-b border-slate-800">
            {logo}
          </div>
        )}
        <div className="flex-1 overflow-y-auto py-4 px-3">{sidebar}</div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden -ml-2 text-slate-500 hover:text-slate-900"
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle Sidebar</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-brand-deep p-0 text-white border-r-slate-800">
                 {logo && (
                  <div className="flex h-16 items-center px-6 border-b border-slate-800 mb-4">
                    {logo}
                  </div>
                )}
                <div className="px-3">{sidebar}</div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-4">
            {userNav}
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
