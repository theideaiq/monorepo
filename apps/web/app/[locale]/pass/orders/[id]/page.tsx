import { Suspense } from "react";
import { OrderDetail } from "@/components/screens/order-detail";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.orders.title"));

interface OrderDetailPageProps {
  readonly params: Promise<{ id: string }>;
}

/** /orders/<id>: an order, also where the payment page returns to. */
const OrderDetailPage = async ({ params }: OrderDetailPageProps) => {
  const { id } = await params;

  return (
    <Suspense fallback={<SectionSpinner />}>
      <OrderDetail orderId={decodeURIComponent(id)} />
    </Suspense>
  );
};

export default OrderDetailPage;
