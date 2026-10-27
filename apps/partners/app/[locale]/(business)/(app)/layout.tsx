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

/**
 * The IDEA Partners, for partners: requires a session (from
 * The IDEA Pass on the website). The Business screens ask for an
 * organization.
 */
const AppLayout = ({ children }: AppLayoutProps) => (
  <RequireAuth>
    <OrganizationProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </OrganizationProvider>
  </RequireAuth>
);

export default AppLayout;
