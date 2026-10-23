import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

interface PageHeroProps {
  readonly badge?: string;
  readonly children?: ReactNode;
  readonly className?: string;
  /** Highlighted end of the title, in the brand colour. */
  readonly highlight?: string;
  readonly subtitle?: string;
  readonly title: string;
}

/** The heading block at the top of every page. */
export const PageHero = ({
  badge,
  children,
  className,
  highlight,
  subtitle,
  title,
}: PageHeroProps) => (
  <section
    className={cn(
      "relative overflow-hidden border-b bg-gradient-to-b from-muted/60 to-background",
      className
    )}
  >
    <div
      aria-hidden="true"
      className="-top-24 pointer-events-none absolute inset-x-0 mx-auto size-[32rem] rounded-full bg-primary/10 blur-3xl"
    />
    <div className="container relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-16 text-center md:py-24">
      {badge ? (
        <span className="rounded-full border bg-background px-3 py-1 font-medium text-xs uppercase tracking-wide">
          {badge}
        </span>
      ) : null}
      <h1 className="text-balance font-bold text-4xl tracking-tight md:text-6xl">
        {title}
        {highlight ? (
          <>
            {" "}
            <span className="text-primary">{highlight}</span>
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
