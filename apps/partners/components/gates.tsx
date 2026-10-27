"use client";

import { passUrl } from "@repo/auth/pass";
import { useAuth } from "@repo/auth/provider";
import { useLocale } from "next-intl";
import { type ReactNode, useEffect } from "react";
import { FullPageSpinner } from "./states";

interface GateProps {
  readonly children: ReactNode;
}

/**
 * Shows its children only to signed-in users and sends everyone else to
 * The IDEA Pass sign-in on the website, coming back to this page afterwards
 * (the session cookie is shared). This is a convenience: the data is
 * protected by Row Level Security, not by this check.
 */
export const RequireAuth = ({ children }: GateProps) => {
  const { loading, user } = useAuth();
  const locale = useLocale();

  useEffect(() => {
    if (loading || user) {
      return;
    }
    window.location.replace(passUrl("/sign-in", window.location.href, locale));
  }, [loading, locale, user]);

  return loading || !user ? <FullPageSpinner /> : children;
};
