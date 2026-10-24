"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { FullPageSpinner } from "@/components/states";
import { goToPass, usesPass } from "@/lib/pass";
import { PhoneSignIn } from "./phone-sign-in";

interface SignInRouteProps {
  readonly mode: "sign-in" | "sign-up";
}

/**
 * `/sign-in` and `/sign-up`: on the web, off to The IDEA Pass (and back to
 * `next`); in the iOS/Android apps, the in-app phone sign-in. Decided after
 * mounting, so the prerendered page (a spinner) hydrates without a mismatch.
 */
export const SignInRoute = ({ mode }: SignInRouteProps) => {
  const locale = useLocale();
  const next = useSearchParams().get("next");
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    if (usesPass()) {
      goToPass(mode === "sign-up" ? "/sign-up" : "/sign-in", locale, next);
    } else {
      setInApp(true);
    }
  }, [locale, mode, next]);

  return inApp ? <PhoneSignIn mode={mode} /> : <FullPageSpinner />;
};
