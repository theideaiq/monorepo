import {
  SidebarInset,
  SidebarProvider,
} from "@repo/design-system/components/ui/sidebar";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { visibleMenu } from "@/lib/admin/roles";
import { requireStaff } from "@/lib/admin/session";

interface ConsoleLayoutProps {
  readonly children: ReactNode;
}

/**
 * Every console page: signed in, staff, at AAL2 (otherwise redirected to
 * sign-in, the no-access page or the authenticator step). Pages and Server
 * Actions check the section again, and RLS checks every query.
 */
const ConsoleLayout = async ({ children }: ConsoleLayoutProps) => {
  const { staff } = await requireStaff();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        menu={visibleMenu(staff.role)}
        name={staff.name}
        role={staff.role}
      />
      <SidebarInset className="min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  );
};

export default ConsoleLayout;
