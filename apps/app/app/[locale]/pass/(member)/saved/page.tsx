import { Suspense } from "react";
import { Wishlist } from "@/components/screens/wishlist";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.wishlist.title"));

/** `/pass/saved`: what the member hearted, their offers and bids. */
const SavedPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Wishlist />
  </Suspense>
);

export default SavedPage;
