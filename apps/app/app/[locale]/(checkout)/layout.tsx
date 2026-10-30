import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RequireAuth } from "@/components/gates";

interface CheckoutLayoutProps {
  readonly children: ReactNode;
}

export const metadata: Metadata = {
  // Personal pages: never indexed.
  robots: { follow: false, index: false },
};

/** The cart and checkout: the signed-in customer's, under the site header. */
const CheckoutLayout = ({ children }: CheckoutLayoutProps) => (
  <RequireAuth>
    <div className="container mx-auto flex flex-col px-4 py-6 md:py-10">
      {children}
    </div>
  </RequireAuth>
);

export default CheckoutLayout;
