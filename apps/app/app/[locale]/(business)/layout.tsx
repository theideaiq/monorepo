import { AnalyticsProvider } from "@repo/analytics/provider";
import type { ReactNode } from "react";

interface BusinessLayoutProps {
  readonly children: ReactNode;
}

/**
 * The business pages (The IDEA Suite, invitations): analytics and the ad
 * pixels, as on the website. The back office loads none.
 */
const BusinessLayout = ({ children }: BusinessLayoutProps) => (
  <AnalyticsProvider>{children}</AnalyticsProvider>
);

export default BusinessLayout;
