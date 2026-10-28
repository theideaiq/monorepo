import { AnalyticsProvider } from "@repo/analytics/provider";
import type { ReactNode } from "react";

interface BusinessLayoutProps {
  readonly children: ReactNode;
}

/**
 * The business pages (Partners, invitations): analytics and the ad
 * pixels, as on the website. Staff loads none.
 */
const BusinessLayout = ({ children }: BusinessLayoutProps) => (
  <AnalyticsProvider>{children}</AnalyticsProvider>
);

export default BusinessLayout;
