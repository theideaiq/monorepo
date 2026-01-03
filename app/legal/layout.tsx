import React from 'react';
import Link from 'next/link';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Simple sidebar links
  const links = [
    { name: "Terms of Service", href: "/legal/terms" },
    { name: "Privacy Policy", href: "/legal/privacy" },
    { name: "Cookie Policy", href: "/legal/cookies" }, // Placeholder for now
    { name: "Acceptable Use", href: "/legal/acceptable-use" }, // Placeholder for now
  ];

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-12">
          
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <h2 className="text-xl font-bold text-brand-dark mb-6 px-4">Legal Center</h2>
            <nav className="flex flex-col space-y-1">
              {links.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-pink rounded-lg transition-colors font-medium block"
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 prose prose-slate max-w-none">
            {children}
          </main>

        </div>
      </div>
    </div>
  );
}
