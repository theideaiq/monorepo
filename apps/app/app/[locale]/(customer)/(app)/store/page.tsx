import { Suspense } from "react";
import { Store } from "@/components/screens/store";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.store.title"));

const StorePage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Store />
  </Suspense>
);

export default StorePage;
