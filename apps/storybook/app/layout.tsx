import type { ReactNode } from "react";

/**
 * The Next.js shell around the static Storybook build (public/). It has no
 * pages of its own; it exists so proxy.ts gates every request.
 */
const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
