import { Suspense } from "react";
import { OrderDetail } from "@/components/screens/order-detail";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.orders.title"));

const OrderDetailPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <OrderDetail />
  </Suspense>
);

export default OrderDetailPage;
