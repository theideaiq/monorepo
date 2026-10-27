import { Suspense } from "react";
import { Developers } from "@/components/screens/developers";
import { SectionSpinner } from "@/components/states";
import { env } from "@/env";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.company.developers.title")
);

const TRAILING_SLASH = /\/$/;

const DevelopersPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Developers
      apiUrl={(env.NEXT_PUBLIC_API_URL ?? "https://api.theideaiq.com").replace(
        TRAILING_SLASH,
        ""
      )}
    />
  </Suspense>
);

export default DevelopersPage;
