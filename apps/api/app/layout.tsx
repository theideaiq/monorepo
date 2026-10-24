import { AnalyticsProvider } from "@repo/analytics/provider";
import { themeColor } from "@repo/design-system/lib/brand";
import type { Viewport } from "next";
import type { ReactNode } from "react";

interface RootLayoutProperties {
  readonly children: ReactNode;
}

export const viewport: Viewport = { themeColor };

const RootLayout = ({ children }: RootLayoutProperties) => (
  <html lang="en">
    <body>
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </body>
  </html>
);

export default RootLayout;
