import Link from 'next/link';
import { LayoutDashboard, Receipt, Users, LogOut } from 'lucide-react';

export default function SuiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-emerald-400">IDEA Suite</h1>
          <p className="text-xs text-slate-400 mt-1">Enterprise Edition</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/suite" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          
          <Link href="/suite/accounting" className="flex items-center gap-3 px-4 py-3 bg-emerald-900/50 text-emerald-100 border border-emerald-800 rounded-lg">
            <Receipt size={20} />
            <span>Accounting</span>
          </Link>
          
          <Link href="/suite/hr" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
            <Users size={20} />
            <span>HR & Payroll</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 w-full rounded-lg transition-colors">
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8">
          <h2 className="font-semibold text-slate-700">The IDEA Foundation</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">Iraqi Dinar: 1 USD = 1,480 IQD</span>
            <div className="h-8 w-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              SF
            </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
