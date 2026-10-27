import { Separator } from "@repo/design-system/components/ui/separator";
import { SidebarTrigger } from "@repo/design-system/components/ui/sidebar";
import { cn } from "@repo/design-system/lib/utils";
import { ChevronLeftIcon, InboxIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/lib/admin/navigation";

interface PageHeaderProps {
  /** Link to the parent page, shown as a back arrow. */
  readonly back?: { href: string; label: string };
  readonly children?: ReactNode;
  readonly description?: ReactNode;
  readonly title: ReactNode;
}

/** The top bar of a console page: sidebar toggle, title and actions. */
export const PageHeader = ({
  back,
  children,
  description,
  title,
}: PageHeaderProps) => (
  <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3">
    <SidebarTrigger className="-ms-1" />
    <Separator className="h-4" orientation="vertical" />
    {back ? (
      <Link
        aria-label={back.label}
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        href={back.href}
      >
        {/* Points back along the reading direction. */}
        <ChevronLeftIcon className="size-4 rtl:rotate-180" />
      </Link>
    ) : null}
    <div className="grid min-w-0 flex-1 gap-0.5">
      <h1 className="truncate font-semibold text-lg">{title}</h1>
      {description ? (
        <p className="truncate text-muted-foreground text-sm">{description}</p>
      ) : null}
    </div>
    {children ? (
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    ) : null}
  </header>
);

/** The padded content area below the header. */
export const PageBody = ({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) => (
  <div className={cn("grid content-start gap-6 p-4 md:p-6", className)}>
    {children}
  </div>
);

export const EmptyState = ({
  children,
  title,
}: {
  readonly children?: ReactNode;
  readonly title: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-10 text-center">
    <InboxIcon className="size-8 text-muted-foreground" />
    <p className="font-medium">{title}</p>
    {children}
  </div>
);

/** A titled block of a detail page or form. */
export const Panel = ({
  actions,
  children,
  className,
  description,
  title,
}: {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly description?: ReactNode;
  readonly title?: ReactNode;
}) => (
  <section
    className={cn(
      "grid content-start gap-4 rounded-lg border bg-card p-4 text-card-foreground md:p-5",
      className
    )}
  >
    {title || actions ? (
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1">
          {title ? <h2 className="font-semibold">{title}</h2> : null}
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
    ) : null}
    {children}
  </section>
);

/** Label/value pairs on detail pages. */
export const DetailList = ({
  items,
}: {
  readonly items: { label: ReactNode; value: ReactNode }[];
}) => (
  <dl className="grid gap-3 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-6">
    {items.map((item, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static list
      <div className="contents" key={index}>
        <dt className="text-muted-foreground">{item.label}</dt>
        <dd className="min-w-0 break-words">{item.value}</dd>
      </div>
    ))}
  </dl>
);

/** A link when there is somewhere to go, plain text otherwise. */
export const MaybeLink = ({
  children,
  className = "hover:underline",
  href,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly href?: string | null | false;
}) =>
  href ? (
    <Link className={className} href={href}>
      {children}
    </Link>
  ) : (
    children
  );
