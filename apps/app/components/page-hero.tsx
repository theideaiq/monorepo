import { BulbKicker } from "@repo/design-system/components/brand/bulb-kicker";
import { Highlight } from "@repo/design-system/components/brand/highlight";
import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

interface PageHeroProps {
  readonly badge?: string;
  readonly children?: ReactNode;
  readonly className?: string;
  /** The highlighted second line of the title (a yellow Highlight). */
  readonly highlight?: string;
  readonly subtitle?: string;
  readonly title: string;
}

/**
 * The heading block at the top of every page: a bulb kicker, a plain first
 * line and a highlighted second, on the page surface.
 */
export const PageHero = ({
  badge,
  children,
  className,
  highlight,
  subtitle,
  title,
}: PageHeroProps) => (
  <section
    className={cn("relative overflow-hidden border-b bg-surface", className)}
  >
    <div className="container relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-16 text-center md:py-24">
      <BulbKicker size="lg" />
      {badge ? (
        <span className="rounded-full border bg-surface-raised px-3 py-1 font-medium text-xs uppercase tracking-wide">
          {badge}
        </span>
      ) : null}
      <h1 className="text-balance text-display-xl [&:lang(ar)]:text-display-ar">
        {title}
        {highlight ? (
          <>
            {" "}
            <Highlight>{highlight}</Highlight>
          </>
        ) : null}
      </h1>
      {subtitle ? (
        <p className="max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed md:text-xl">
          {subtitle}
        </p>
      ) : null}
      {children ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {children}
        </div>
      ) : null}
    </div>
  </section>
);
