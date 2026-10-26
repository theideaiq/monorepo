import { Suspense } from "react";
import { PersonalPage } from "@/components/personal-page";
import { Wishlist } from "@/components/screens/wishlist";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.wishlist.title"));

/** Saved: the items the member hearted, from the heart in the top bar. */
const SavedPage = () => (
  <PersonalPage>
    <Suspense fallback={<SectionSpinner />}>
      <Wishlist />
    </Suspense>
  </PersonalPage>
);

export default SavedPage;
