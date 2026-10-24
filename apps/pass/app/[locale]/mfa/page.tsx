import { passUrl } from "@repo/auth/pass";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MfaForm } from "@/components/mfa-form";
import { SignOutButton } from "@/components/sign-out-button";
import { readReturnTo, type SearchParams } from "@/lib/return-to";
import { getPassSession } from "@/lib/session";

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
 * back office) send staff here; staff rights need AAL2 in the database too.
 */
const MfaPage = async ({ searchParams }: MfaPageProps) => {
  const [locale, returnTo, session] = await Promise.all([
    getLocale(),
    readReturnTo(searchParams),
    getPassSession(),
  ]);

  if (!session) {
    // Sign in first, then come back here (with the same return_to).
    redirect(
      `/${locale}/sign-in?${new URLSearchParams({
        return_to: passUrl("/mfa", returnTo, locale),
      })}`
    );
  }

  if (session.aal === "aal2") {
    redirect(returnTo ?? `/${locale}`);
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
