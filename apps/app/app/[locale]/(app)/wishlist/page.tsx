import { Suspense } from "react";
import { Wishlist } from "@/components/screens/wishlist";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.wishlist.title"));

const WishlistPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Wishlist />
  </Suspense>
);

export default WishlistPage;
