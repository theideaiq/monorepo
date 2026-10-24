import { AnalyticsProvider } from "@repo/analytics/provider";
import type { ReactNode } from "react";

interface CustomerLayoutProps {
  readonly children: ReactNode;
}

/**
 * Everything customers see (the app, The IDEA Pass, onboarding): analytics
 * and, on the web only, the ad pixels. The back office loads none.
 */
const CustomerLayout = ({ children }: CustomerLayoutProps) => (
  <AnalyticsProvider>{children}</AnalyticsProvider>
);

export default CustomerLayout;
