import { Suspense } from "react";
import { Cart } from "@/components/screens/cart";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.cart.title"));

const CartPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Cart />
  </Suspense>
);

export default CartPage;
