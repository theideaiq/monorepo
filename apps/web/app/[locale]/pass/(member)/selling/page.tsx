import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { Selling } from "@/components/screens/selling";
import { SectionSpinner } from "@/components/states";
import { env } from "@/env";
import { titleFrom } from "@/lib/app-metadata";
import { appLink } from "@/lib/links";

export const generateMetadata = titleFrom((t) => t("app.selling.title"));

/**
 * Your Pass → Selling: ask shops for offers on your own things, or sell
 * them yourself as an individual trader in Partners.
 */
const SellingPage = async () => {
  const locale = await getLocale();
  return (
    <Suspense fallback={<SectionSpinner />}>
      <Selling
        sellUrl={appLink(env.NEXT_PUBLIC_APP_URL, locale, "/new", {
          for: "selling",
        })}
      />
    </Suspense>
  );
};

export default SellingPage;
