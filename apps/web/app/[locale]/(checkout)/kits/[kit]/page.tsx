import { Suspense } from "react";
import { KitCheckout } from "@/components/screens/kit-checkout";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.kits.title"));

interface KitPageProps {
  readonly params: Promise<{ kit: string }>;
}

/** /kits/<kit>: booking a game night kit for a weekend. */
const KitPage = async ({ params }: KitPageProps) => {
  const { kit } = await params;

  return (
    <Suspense fallback={<SectionSpinner />}>
      <KitCheckout kit={decodeURIComponent(kit)} />
    </Suspense>
  );
};

export default KitPage;
