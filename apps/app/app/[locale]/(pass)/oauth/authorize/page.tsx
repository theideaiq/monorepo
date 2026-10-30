import { Suspense } from "react";
import { RequireAuth } from "@/components/gates";
import { PassConsent } from "@/components/pass/pass-consent";
import { SectionSpinner } from "@/components/states";
import { env } from "@/env";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("pass.authorize.meta"));

const TRAILING_SLASH = /\/$/;

/** The provider's issuer (the API), sent back to partners with the code. */
const issuer = () =>
  `${(env.NEXT_PUBLIC_API_URL ?? "https://api.theideaiq.com").replace(TRAILING_SLASH, "")}/oidc`;

/** /oauth/authorize: Sign in with The IDEA Pass on a partner site. */
const AuthorizePage = () => (
  <RequireAuth>
    <Suspense fallback={<SectionSpinner />}>
      <PassConsent issuer={issuer()} />
    </Suspense>
  </RequireAuth>
);

export default AuthorizePage;
