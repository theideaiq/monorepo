import {
  SidebarInset,
  SidebarProvider,
} from "@repo/design-system/components/ui/sidebar";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { ConsoleCommandBar } from "@/components/admin/console-command-bar";
import { commandPages } from "@/lib/admin/command-pages";
import { loadInbox, menuCounts } from "@/lib/admin/inbox";
import { visibleMenu } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";

interface ConsoleLayoutProps {
  readonly children: ReactNode;
}

/**
 * Every console page: signed in, staff, at AAL2 (otherwise redirected to
 * sign-in, the no-access page or the authenticator step). Pages and Server
 * Actions check the section again, and RLS checks every query. The menu
 * shows counts only where something needs action; Ctrl/⌘K opens the
 * command bar.
 */
const ConsoleLayout = async ({ children }: ConsoleLayoutProps) => {
  const { staff, supabase } = await requireStaff();
  const [cookieStore, summary] = await Promise.all([
    cookies(),
    loadInbox(supabase, staff.role),
  ]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        counts={menuCounts(summary)}
        menu={visibleMenu(staff.role)}
        name={staff.name}
        role={staff.role}
      />
      <SidebarInset className="min-w-0">{children}</SidebarInset>
      <ConsoleCommandBar pages={commandPages(staff.role)} />
    </SidebarProvider>
  );
};

export default ConsoleLayout;
