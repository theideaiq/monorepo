import { Suspense } from "react";
import { RequireAuth } from "@/components/gates";
import { PassEmbedConnect } from "@/components/pass/pass-embed-connect";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("pass.embed.connect.meta"));

/** /pass/embed/connect: the popup where a member lets a site show their card. */
const ConnectPage = () => (
  <main className="mx-auto grid min-h-dvh w-full max-w-sm content-center p-6">
    <RequireAuth>
      <Suspense fallback={<SectionSpinner />}>
        <PassEmbedConnect />
      </Suspense>
    </RequireAuth>
  </main>
);

export default ConnectPage;
