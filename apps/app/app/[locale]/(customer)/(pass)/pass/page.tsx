import { formatPhone } from "@repo/auth/phone";
import { Button } from "@repo/design-system/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { SignOutButton } from "@/components/pass/sign-out-button";
import { env } from "@/env";
import { getPassSession } from "@/lib/pass/session";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.home");
  return { title: t("title") };
};

const TRAILING_SLASH = /\/+$/;
const siteLink = (base: string, locale: string) =>
  `${base.replace(TRAILING_SLASH, "")}/${locale}`;

/** "Your Pass": who is signed in, links to The IDEA Spark, and sign-out. */
const PassHomePage = async () => {
  const [locale, session] = await Promise.all([getLocale(), getPassSession()]);

  if (!session) {
    redirect(
      `/${locale}/sign-in?${new URLSearchParams({ return_to: `/${locale}/pass` })}`
    );
  }

  const t = await getTranslations("pass.home");
  // Staff see a link to the back office (RLS: everyone reads their own row).
  const [{ data: profile }, { data: staff }] = await Promise.all([
    session.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", session.user.id)
      .maybeSingle(),
    session.supabase
      .from("staff")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle(),
  ]);
  const name = profile?.full_name?.trim();
  const phone = session.user.phone ? formatPhone(session.user.phone) : null;

  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <dl className="grid gap-3 rounded-lg border p-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">{t("nameLabel")}</dt>
          <dd className="truncate font-medium">{name || t("noName")}</dd>
        </div>
        {phone ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{t("phoneLabel")}</dt>
            {/* Phone numbers read left-to-right in Arabic too. */}
            <dd className="font-medium" dir="ltr">
              {phone}
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">{t("authenticator")}</dt>
          <dd className="flex items-center gap-2 font-medium">
            {session.totpFactorId ? (
              t("authenticatorOn")
            ) : (
              <>
                {t("authenticatorOff")}
                <Button asChild size="sm" variant="link">
                  <Link href="/mfa">{t("setUpAuthenticator")}</Link>
                </Button>
              </>
            )}
          </dd>
        </div>
      </dl>
      <div className="grid gap-2">
        <Button asChild>
          <Link href="/">{t("openApp")}</Link>
        </Button>
        {staff ? (
          <Button asChild variant="outline">
            <Link href="/admin">{t("backOffice")}</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <a href={siteLink(env.NEXT_PUBLIC_WEB_URL, locale)}>
            {t("website")}
            <ExternalLinkIcon className="rtl:-scale-x-100" />
          </a>
        </Button>
        <SignOutButton className="w-full" variant="ghost" />
      </div>
    </div>
  );
};

export default PassHomePage;
