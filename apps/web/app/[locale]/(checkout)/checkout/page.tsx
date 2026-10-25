import { Suspense } from "react";
import { Checkout } from "@/components/screens/checkout";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.checkout.title"));

const CheckoutPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Checkout />
  </Suspense>
);

export default CheckoutPage;
