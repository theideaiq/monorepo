import { Suspense } from "react";
import { Orders } from "@/components/screens/orders";
import { Sell } from "@/components/screens/sell";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.orders.title"));

/** Your Pass → Orders: everything bought, rented or booked, then Sell to us. */
const OrdersPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <div className="flex flex-col gap-10">
      <Orders />
      <Sell />
    </div>
  </Suspense>
);

export default OrdersPage;
