import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAuth } from "@/components/gates";
import { KitCheckout } from "@/components/screens/kit-checkout";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = async (
  ...args: Parameters<ReturnType<typeof titleFrom>>
): Promise<Metadata> => ({
  ...(await titleFrom((t) => t("app.kits.title"))(...args)),
  // A booking for the signed-in customer: never indexed.
  robots: { follow: false, index: false },
});

interface KitPageProps {
  readonly params: Promise<{ kit: string }>;
}

/** /store/kits/<kit>: booking a game night kit for a weekend. */
const KitPage = async ({ params }: KitPageProps) => {
  const { kit } = await params;

  return (
    <RequireAuth>
      <div className="container mx-auto flex flex-col px-4 py-6 md:py-10">
        <Suspense fallback={<SectionSpinner />}>
          <KitCheckout kit={decodeURIComponent(kit)} />
        </Suspense>
      </div>
    </RequireAuth>
  );
};

export default KitPage;
