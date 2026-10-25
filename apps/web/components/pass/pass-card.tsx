import { formatPhone } from "@repo/auth/phone";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Button } from "@repo/design-system/components/ui/button";
import { formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { env } from "@/env";
import { appLink } from "@/lib/links";
import type { PassSession } from "@/lib/pass/session";
import { SignOutButton } from "./sign-out-button";

interface PassCardProps {
  readonly session: PassSession;
}

const Row = ({
  children,
  label,
}: {
  readonly children: React.ReactNode;
  readonly label: string;
}) => (
  <div className="flex items-center justify-between gap-4">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="flex min-w-0 items-center gap-2 truncate font-medium">
      {children}
    </dd>
  </div>
);

/**
 * The membership card at the top of My Pass: who is signed in, since when,
 * the authenticator app, sign-out and, for staff, The IDEA Spark.
 */
export const PassCard = async ({ session }: PassCardProps) => {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("pass.home"),
  ]);
  // Staff see a link to the back office (RLS: everyone reads their own row).
  const [{ data: profile }, { data: staff }] = await Promise.all([
    session.supabase
      .from("profiles")
      .select("full_name, created_at")
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
    <section className="grid gap-4 rounded-xl border bg-card p-5 text-card-foreground shadow-sm md:grid-cols-[1fr_auto]">
      <div className="grid content-start gap-4">
        <div className="grid gap-1">
          <BrandLogo line="Pass" />
          <p className="truncate font-semibold text-xl">
            {name || t("noName")}
          </p>
          {profile ? (
            <p className="text-muted-foreground text-sm">
              {t("memberSince", {
                date: formatDate(profile.created_at, locale),
              })}
            </p>
          ) : null}
        </div>
        <dl className="grid gap-2 text-sm">
          {session.user.email ? (
            <Row label={t("emailLabel")}>
              {/* Addresses read left-to-right in Arabic too. */}
              <span className="truncate" dir="ltr">
                {session.user.email}
              </span>
            </Row>
          ) : null}
          {/* Accounts from the phone sign-in days still show their number. */}
          {phone ? (
            <Row label={t("phoneLabel")}>
              <span dir="ltr">{phone}</span>
            </Row>
          ) : null}
          <Row label={t("authenticator")}>
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
          </Row>
        </dl>
      </div>
      <div className="grid content-start gap-2 md:w-56">
        {staff ? (
          <Button asChild variant="outline">
            <a href={appLink(env.NEXT_PUBLIC_APP_URL, locale)}>
              {t("backOffice")}
              <ExternalLinkIcon className="rtl:-scale-x-100" />
            </a>
          </Button>
        ) : null}
        <SignOutButton className="w-full" variant="ghost" />
      </div>
    </section>
  );
};
