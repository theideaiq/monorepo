import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

/**
 * A page's main action (and at most one second action before it): on
 * phones a bar fixed above the tabs, full width (or two halves); from
 * tablet width up it sits where it is placed, in the page header or the
 * side panel. The UX overhaul's button placement.
 */
export const Dock = ({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) => (
  <>
    {/* Keeps the end of the page clear of the bar on phones. */}
    <div aria-hidden="true" className="h-20 md:hidden" />
    <div
      className={cn(
        "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        className
      )}
    >
      <div className="flex items-center gap-2 *:min-h-11 *:flex-1 md:justify-end md:*:flex-none">
        {children}
      </div>
    </div>
  </>
);
