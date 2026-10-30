import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

/**
 * The ground of every Plus page: the dark palette whatever the theme
 * (Plus surfaces are darker and cover-led), scoped to the page.
 */
export const PlusSurface = ({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) => (
  <div
    className={cn(
      "dark flex flex-1 flex-col bg-background pb-12 text-foreground",
      className
    )}
    data-surface="plus"
  >
    {children}
  </div>
);
