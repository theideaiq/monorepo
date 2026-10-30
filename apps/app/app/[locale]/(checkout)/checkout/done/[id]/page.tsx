import { Suspense } from "react";
import { CheckoutDone } from "@/components/screens/checkout-done";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.checkout.done.title"));

interface DoneProps {
  readonly params: Promise<{ id: string }>;
}

/** /checkout/done/<order>: the order placed, its Bulbs and the next step. */
const DonePage = async ({ params }: DoneProps) => {
  const { id } = await params;
  return (
    <Suspense fallback={<SectionSpinner />}>
      <CheckoutDone orderId={decodeURIComponent(id)} />
    </Suspense>
  );
};

export default DonePage;
