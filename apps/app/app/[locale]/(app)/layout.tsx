import {
  SidebarInset,
  SidebarProvider,
} from "@repo/design-system/components/ui/sidebar";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { RequireAuth, RequireOnboarding } from "@/components/gates";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { OrganizationProvider } from "@/components/organization-provider";

interface AppLayoutProps {
  readonly children: ReactNode;
}

/**
 * The signed-in app: requires a session and a finished onboarding. Business
 * accounts (organizations) are optional; the Business screens ask for one.
 */
const AppLayout = ({ children }: AppLayoutProps) => (
  <RequireAuth>
    <OrganizationProvider>
      <RequireOnboarding>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </SidebarInset>
          <MobileTabBar />
        </SidebarProvider>
      </RequireOnboarding>
    </OrganizationProvider>
  </RequireAuth>
);

export default AppLayout;
