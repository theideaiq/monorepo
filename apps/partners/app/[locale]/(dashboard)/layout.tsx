import { AnalyticsProvider } from "@repo/analytics/provider";
import type { ReactNode } from "react";

interface DashboardLayoutProps {
  readonly children: ReactNode;
}

/**
 * The Partners pages (the dashboard, invitations): analytics and the ad
 * pixels, as on the website. Staff loads none.
 */
const DashboardLayout = ({ children }: DashboardLayoutProps) => (
  <AnalyticsProvider>{children}</AnalyticsProvider>
);

export default DashboardLayout;
