"use client";

import { project } from "@repo/config";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Button } from "@repo/design-system/components/ui/button";
import { withoutLocalePrefix } from "@repo/internationalization";
import { safeNextPath } from "@repo/internationalization/app-paths";
import { useRouter } from "@repo/internationalization/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { DeleteAccountDialog } from "@/components/account/delete-account";
import { BirthdayCard } from "@/components/birthday-settings";
import { ProfileForm } from "@/components/profile-form";
import { ErrorState, FullPageSpinner } from "@/components/states";
import { useMyGuardian } from "@/lib/guardian";
import { needsOnboarding } from "@/lib/onboarding";
import { useMemberships, useProfile } from "@/lib/queries";

/**
 * First run after sign-up: name, language and marketing emails. Business
 * accounts (organizations) are optional and live under Business, so there
 * is no organization step. Afterwards the user goes on to `next`.
 */
export const OnboardingFlow = () => {
  const t = useTranslations("app.onboarding");
  const tAccount = useTranslations("app.settings.deleteAccount");
  const router = useRouter();
  // Without its locale prefix: the router adds the locale.
  const next = withoutLocalePrefix(
    safeNextPath(useSearchParams().get("next")) ?? "/pass"
  );
  const memberships = useMemberships();
  const profile = useProfile();
  // The date of birth comes first: the Pass is for 13 and over.
  const age = useMyGuardian();
  const finishing = useRef(false);

  const done =
    profile.data && memberships.data
      ? !needsOnboarding(profile.data, memberships.data.length)
      : false;

  // Already set up (e.g. opened /onboarding directly): go on.
  useEffect(() => {
    if (done && !finishing.current) {
      router.replace(next);
    }
  }, [done, next, router]);

  if (memberships.isError || profile.isError) {
    return (
      <ErrorState
        className="min-h-dvh"
        onRetry={() => {
          memberships.refetch();
          profile.refetch();
        }}
      />
    );
  }

  if (!(memberships.data && profile.data) || (done && !finishing.current)) {
    return <FullPageSpinner />;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 p-6">
      <div className="grid gap-3">
        <BrandLogo />
        <h1 className="font-semibold text-2xl tracking-tight">
          {t("title", { name: project.name })}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {age.data && !age.data.has_birthday ? <BirthdayCard /> : null}

      <section className="grid gap-4" hidden={!age.data?.has_birthday}>
        <div className="grid gap-1">
          <h2 className="font-medium text-lg">{t("profile.title")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("profile.description")}
          </p>
        </div>
        <ProfileForm
          initialMarketingOptIn={profile.data.marketing_opt_in}
          initialName={profile.data.full_name ?? ""}
          onSaved={(language) => {
            finishing.current = true;
            // Switching language reloads the destination in that language.
            router.replace(next, { locale: language });
          }}
          submitLabel={t("profile.submit")}
        />
      </section>

      {/* Account deletion must be reachable from the first screen too. */}
      <footer className="border-t pt-4 text-center">
        <DeleteAccountDialog
          trigger={
            <Button
              className="text-muted-foreground"
              size="sm"
              type="button"
              variant="link"
            >
              {tAccount("open")}
            </Button>
          }
        />
      </footer>
    </main>
  );
};
