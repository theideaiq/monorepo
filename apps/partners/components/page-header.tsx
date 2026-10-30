"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@repo/design-system/components/ui/breadcrumb";
import { Separator } from "@repo/design-system/components/ui/separator";
import { SidebarTrigger } from "@repo/design-system/components/ui/sidebar";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { NotificationBell } from "./notification-bell";

interface PageHeaderProps {
  /** The page's actions, the primary last (it sits at the end). */
  readonly actions?: ReactNode;
  /** The group the page belongs to ("Sell", "Organization"). */
  readonly crumb?: string;
  /** A status chip after the title. */
  readonly status?: ReactNode;
  readonly title: string;
}

/**
 * Every page's header: the menu button, the breadcrumb and the bell, then
 * the title with its status chip and the actions at the end.
 */
export const PageHeader = ({
  actions,
  crumb,
  status,
  title,
}: PageHeaderProps) => {
  const t = useTranslations("app.nav");
  return (
    <header className="flex shrink-0 flex-col gap-2 px-4 pt-3 pb-4">
      <div className="flex h-10 items-center gap-2">
        <SidebarTrigger className="-ms-1" />
        <Separator className="me-2 h-4" orientation="vertical" />
        {crumb ? (
          <Breadcrumb aria-label={t("breadcrumb")} className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem>{crumb}</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
        <div className="ms-auto flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        {status}
        {actions ? (
          <div className="ms-auto flex flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
};
