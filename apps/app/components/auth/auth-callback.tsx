"use client";

import { isAllowedReturnTo } from "@repo/auth/pass";
import { useAuth } from "@repo/auth/provider";
import { takeReturnTo } from "@repo/auth/social";
import { Button } from "@repo/design-system/components/ui/button";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { FullPageSpinner } from "@/components/states";

/**
 * Web landing page for OAuth and magic links (PKCE). The browser client
 * exchanges `?code` for a session by itself as it starts (a code works only
 * once, so exchanging it here too would fail); this page waits for that and
 * goes home once there is a session. The native apps handle the same link in
 * the native bridge.
 */
export const AuthCallback = () => {
  const t = useTranslations("auth.callback");
  const { supabase } = useAuth();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    // Resolves after the client has handled the code in the URL.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) {
        return;
      }
      if (data.session) {
        // A university Google account verifies the student badge at once
        // (nothing happens otherwise).
        await supabase.rpc("claim_student_from_identity");
        // Back where sign-in started (a path here or another site of The
        // IDEA), else Your Pass.
        const returnTo = takeReturnTo();
        if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
          window.location.assign(returnTo);
        } else if (isAllowedReturnTo(returnTo)) {
          window.location.assign(returnTo);
        } else {
          router.replace("/pass");
        }
      } else {
        setFailed(true);
      }
    });
    return () => {
      active = false;
    };
  }, [router, supabase]);

  if (!failed) {
    return <FullPageSpinner />;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p role="alert">{t("failed")}</p>
      <Button asChild variant="outline">
        <Link href="/sign-in">{t("retry")}</Link>
      </Button>
    </main>
  );
};
