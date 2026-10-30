import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/design-system/components/ui/breadcrumb";
import { Separator } from "@repo/design-system/components/ui/separator";
import { SidebarTrigger } from "@repo/design-system/components/ui/sidebar";
import type { ReactNode } from "react";
import { Link } from "@/lib/admin/navigation";
import { CommandTrigger } from "./console-command-bar";
import { type SectionTab, SectionTabs } from "./section-tabs";

export interface RecordNumber {
  /** Shown as a link when set (e.g. to the list behind the number). */
  href?: string;
  label: ReactNode;
  value: ReactNode;
}

interface RecordHeaderProps {
  /**
   * Other actions, before the primary (outline or quiet buttons, the
   * destructive one last among them).
   */
  readonly actions?: ReactNode;
  /** The pages above this record, from the section down. */
  readonly breadcrumb: readonly { href: string; label: string }[];
  /** Status chips beside the title (StatusBadge). */
  readonly chips?: ReactNode;
  /** A line under the title (when it was made, its slug…). */
  readonly description?: ReactNode;
  /** The key numbers of the record, in a row under the title. */
  readonly numbers?: readonly RecordNumber[];
  /** The record's main action, always at the end. */
  readonly primary?: ReactNode;
  /**
   * Parts of the page to jump to (`#id`), or sub-pages of the record
   * (SectionTabs).
   */
  readonly tabs?: readonly { href: string; label: string }[];
  readonly title: ReactNode;
}

/**
 * The one header of every record page (customer, order, product, ticket,
 * event, request): breadcrumb · title · status chips · actions at the end,
 * primary last · key numbers · tabs. The page's activity follows below.
 */
export const RecordHeader = ({
  actions,
  breadcrumb,
  chips,
  description,
  numbers,
  primary,
  tabs,
  title,
}: RecordHeaderProps) => {
  const anchors = tabs?.every((tab) => tab.href.startsWith("#")) ?? false;

  return (
    <header className="border-b">
      <div className="flex items-center gap-3 px-4 pt-3">
        <SidebarTrigger className="-ms-1" />
        <Separator className="h-4" orientation="vertical" />
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="flex-nowrap">
            {breadcrumb.map((crumb) => (
              <BreadcrumbItem className="contents" key={crumb.href}>
                <Link
                  className="truncate transition-colors hover:text-foreground"
                  href={crumb.href}
                >
                  {crumb.label}
                </Link>
                <BreadcrumbSeparator />
              </BreadcrumbItem>
            ))}
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <CommandTrigger />
      </div>

      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 px-4 pt-3 pb-4">
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words font-semibold text-xl">
              {title}
            </h1>
            {chips}
          </div>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {actions || primary ? (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {primary}
          </div>
        ) : null}
      </div>

      {numbers && numbers.length > 0 ? (
        <dl className="flex flex-wrap gap-x-8 gap-y-3 px-4 pb-4">
          {numbers.map((number, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list per page
            <div className="grid gap-0.5" key={index}>
              <dt className="text-muted-foreground text-xs">{number.label}</dt>
              <dd className="font-semibold text-lg tabular-nums">
                {number.href?.startsWith("#") ? (
                  <a className="hover:underline" href={number.href}>
                    {number.value}
                  </a>
                ) : null}
                {number.href && !number.href.startsWith("#") ? (
                  <Link className="hover:underline" href={number.href}>
                    {number.value}
                  </Link>
                ) : null}
                {number.href ? null : number.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {tabs && tabs.length > 0 && anchors ? (
        <nav className="flex gap-1 overflow-x-auto px-4">
          {tabs.map((tab) => (
            <a
              className="-mb-px whitespace-nowrap border-transparent border-b-2 px-3 py-2.5 font-medium text-muted-foreground text-sm transition-colors hover:border-border hover:text-foreground"
              href={tab.href}
              key={tab.href}
            >
              {tab.label}
            </a>
          ))}
        </nav>
      ) : null}
      {tabs && tabs.length > 0 && !anchors ? (
        <SectionTabs tabs={tabs as SectionTab[]} />
      ) : null}
    </header>
  );
};
