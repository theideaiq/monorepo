import type { ReactNode } from "react";
import { NotificationBell } from "./notification-bell";

interface PageHeaderProps {
  readonly children?: ReactNode;
  readonly title: string;
}

/** The title row of a Your Pass page, with the notifications bell. */
export const PageHeader = ({ children, title }: PageHeaderProps) => (
  <header className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 pb-4">
    <h1 className="truncate font-semibold text-2xl tracking-tight">{title}</h1>
    <div className="ms-auto flex items-center gap-2">
      {children}
      <NotificationBell />
    </div>
  </header>
);
