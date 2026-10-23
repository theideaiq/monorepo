import {
  SidebarInset,
  SidebarProvider,
} from "@repo/design-system/components/ui/sidebar";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { RequireAuth } from "@/components/gates";
import { OrganizationProvider } from "@/components/organization-provider";

interface AppLayoutProps {
  readonly children: ReactNode;
}

/** The signed-in app: requires a session and an organization. */
const AppLayout = ({ children }: AppLayoutProps) => {
  const shell = (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );

  return (
    <RequireAuth>
      <OrganizationProvider>{shell}</OrganizationProvider>
    </RequireAuth>
  );
};

export default AppLayout;
