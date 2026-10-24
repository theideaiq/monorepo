"use client";

import { cn } from "@repo/design-system/lib/utils";
import { Link, usePathname } from "@/lib/admin/navigation";

export interface SectionTab {
  /** Set by the page when the tab depends on the query string. */
  active?: boolean;
  /** Exact match only (for a section's index page). */
  exact?: boolean;
  href: string;
  label: string;
  /** Other path prefixes that belong to this tab. */
  match?: string[];
}

/** Sub-navigation of a section (e.g. Products · Categories · Plans). */
export const SectionTabs = ({ tabs }: { readonly tabs: SectionTab[] }) => {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b px-4">
      {tabs.map((tab) => {
        const prefixes = tab.match ?? [];
        const active =
          tab.active ??
          ((tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)) ||
            prefixes.some(
              (prefix) =>
                pathname === prefix || pathname.startsWith(`${prefix}/`)
            ));
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 font-medium text-sm transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            href={tab.href}
            key={tab.href}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};
