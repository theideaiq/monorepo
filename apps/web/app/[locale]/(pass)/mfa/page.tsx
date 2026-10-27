import { localePath } from "@repo/internationalization";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MfaForm } from "@/components/pass/mfa-form";
import { SignOutButton } from "@/components/pass/sign-out-button";
import { readReturnTo, type SearchParams } from "@/lib/pass/return-to";
import { getPassSession } from "@/lib/pass/session";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.mfa");
  return { title: t("title") };
};

interface MfaPageProps {
  readonly searchParams: SearchParams;
}

/**
 * The second step: set up an authenticator app (TOTP) the first time, then
 * enter its code, which raises the session to AAL2. Staff-only sites (the
 * Staff) send staff here; staff rights need AAL2 in the database too.
 */
const MfaPage = async ({ searchParams }: MfaPageProps) => {
  const locale = await getLocale();
  const [returnTo, session] = await Promise.all([
    readReturnTo(searchParams, locale),
    getPassSession(),
  ]);

  if (!session) {
    // Sign in first, then come back here (with the same return_to).
    redirect(
      `${localePath(locale, "/sign-in")}?${new URLSearchParams({
        return_to: returnTo
          ? `${localePath(locale, "/mfa")}?${new URLSearchParams({ return_to: returnTo })}`
          : localePath(locale, "/mfa"),
      })}`
    );
  }

  if (session.aal === "aal2") {
    redirect(returnTo ?? localePath(locale, "/pass"));
  }

  const t = await getTranslations("pass.mfa");
  const verified = session.totpFactorId;

  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">
          {verified ? t("challengeTitle") : t("enrollTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {verified ? t("challengeDescription") : t("enrollDescription")}
        </p>
      </div>
      <MfaForm factorId={verified} returnTo={returnTo} />
      <SignOutButton className="w-full" returnTo={returnTo} variant="ghost" />
    </div>
  );
};

export default MfaPage;
