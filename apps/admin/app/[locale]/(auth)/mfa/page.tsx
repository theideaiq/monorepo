import { redirect } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SignOutButton } from "@/components/sign-out-button";
import { getSession } from "@/lib/session";
import { MfaForm } from "./mfa-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.mfa");
  return { title: t("title") };
};

/**
 * Second step for staff: set up an authenticator app (TOTP) the first time,
 * then enter its code on every sign-in, which raises the session to AAL2.
 */
const MfaPage = async () => {
  const locale = await getLocale();
  const session = await getSession();

  if (session.status === "signed-out") {
    redirect({ href: "/sign-in", locale });
  }
  if (session.status === "not-staff") {
    redirect({ href: "/no-access", locale });
  }
  if (session.status !== "needs-mfa") {
    redirect({ href: "/", locale });
  }

  const t = await getTranslations("admin.mfa");
  const verified =
    session.status === "needs-mfa"
      ? session.factors.find((factor) => factor.verified)
      : undefined;

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
      <MfaForm factorId={verified?.id ?? null} />
      <SignOutButton className="w-full" variant="ghost" />
    </div>
  );
};

export default MfaPage;
