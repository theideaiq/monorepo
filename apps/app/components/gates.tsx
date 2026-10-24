"use client";

import { useAuth } from "@repo/auth/provider";
import { usePathname, useRouter } from "@repo/internationalization/navigation";
import { useLocale } from "next-intl";
import { type ReactNode, useEffect } from "react";
import { safeNextPath } from "@/lib/navigation";
import { needsOnboarding } from "@/lib/onboarding";
import { goToPass, usesPass } from "@/lib/pass";
import { useProfile } from "@/lib/queries";
import { useOrganization } from "./organization-provider";
import { ErrorState, FullPageSpinner } from "./states";

interface GateProps {
  readonly children: ReactNode;
}

/**
 * Shows its children only to signed-in users and sends everyone else to
 * sign in (The IDEA Pass on the web, the in-app page in the iOS/Android
 * apps), coming back afterwards. This is a convenience: the data is
 * protected by Row Level Security, not by this check.
 */
export const RequireAuth = ({ children }: GateProps) => {
  const { loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    if (loading || user) {
      return;
    }
    const next = `${pathname}${window.location.search}`;
    if (usesPass()) {
      goToPass("/sign-in", locale, next);
    } else {
      router.replace({ pathname: "/sign-in", query: { next } });
    }
  }, [loading, locale, pathname, router, user]);

  return loading || !user ? <FullPageSpinner /> : children;
};

/**
 * Sends people who haven't been through onboarding (name, language,
 * marketing emails) there first, coming back afterwards. Must be inside
 * <OrganizationProvider>.
 */
export const RequireOnboarding = ({ children }: GateProps) => {
  const profile = useProfile();
  const { organizations } = useOrganization();
  const router = useRouter();
  const pathname = usePathname();
  const pending = profile.data
    ? needsOnboarding(profile.data, organizations.length)
    : null;

  useEffect(() => {
    if (pending) {
      router.replace({
        pathname: "/onboarding",
        query: { next: `${pathname}${window.location.search}` },
      });
    }
  }, [pathname, pending, router]);

  if (profile.isError) {
    return (
      <ErrorState className="min-h-dvh" onRetry={() => profile.refetch()} />
    );
  }

  return pending === false ? children : <FullPageSpinner />;
};

/** Sign-in and sign-up pages: signed-in users go on to the app. */
export const GuestOnly = ({ children }: GateProps) => {
  const { loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(safeNextPath(next) ?? "/");
    }
  }, [loading, router, user]);

  return loading || user ? <FullPageSpinner /> : children;
};
