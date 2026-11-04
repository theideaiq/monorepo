import { cn } from "@repo/design-system/lib/utils";
import { Link } from "@repo/internationalization/navigation";
import { MoveRight } from "lucide-react";
import type { ReactNode } from "react";

interface SectionProps {
  readonly action?: { href: string; label: string };
  readonly children: ReactNode;
  readonly className?: string;
  readonly description?: string;
  readonly id?: string;
  readonly title?: string;
}

/** A page section with an optional heading and "view all" link. */
export const Section = ({
  action,
  children,
  className,
  description,
  id,
  title,
}: SectionProps) => (
  <section className={cn("container mx-auto px-4 py-14", className)} id={id}>
    {title ? (
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-bold text-2xl tracking-tight md:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="max-w-2xl text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? (
          <Link
            className="inline-flex items-center gap-2 font-medium text-pink-text text-sm hover:underline"
            href={action.href}
          >
            {action.label}
            <MoveRight className="size-4 rtl:rotate-180" />
          </Link>
        ) : null}
      </div>
    ) : null}
    {children}
  </section>
);

interface EmptyStateProps {
  /** The next step: a page on the site, or an outside link (Telegram). */
  readonly action?: {
    readonly external?: boolean;
    readonly href: string;
    readonly label: string;
  };
  readonly children: ReactNode;
}

/** A muted, centred note for empty lists, with the next step when there is one. */
export const EmptyState = ({ action, children }: EmptyStateProps) => {
  if (!action) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
        {children}
      </p>
    );
  }
  const label = (
    <>
      {action.label}
      <MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" />
    </>
  );
  const linkClass =
    "inline-flex min-h-11 items-center gap-2 font-medium text-pink-text hover:underline";
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center">
      <p className="text-muted-foreground">{children}</p>
      {action.external ? (
        <a
          className={linkClass}
          href={action.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {label}
        </a>
      ) : (
        <Link className={linkClass} href={action.href}>
          {label}
        </Link>
      )}
    </div>
  );
};
