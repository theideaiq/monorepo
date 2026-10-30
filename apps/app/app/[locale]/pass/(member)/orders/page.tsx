import { Suspense } from "react";
import { Orders } from "@/components/screens/orders";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.orders.title"));

/** Your Pass → Orders: everything bought, rented or booked. */
const OrdersPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Orders />
  </Suspense>
);

export default OrdersPage;
