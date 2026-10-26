import { formatPhone } from "@repo/auth/phone";
import { formatPrice, planName } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import {
  CalendarDaysIcon,
  CrownIcon,
  ExternalLinkIcon,
  HandCoinsIcon,
  LightbulbIcon,
  type LucideIcon,
  TruckIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { env } from "@/env";
import { appLink } from "@/lib/links";
import type { PassSession } from "@/lib/pass/session";
import { LiveCard } from "./live-card";
import { SignOutButton } from "./sign-out-button";
import { WalletButton } from "./wallet-button";

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

interface Perk {
  readonly href?: string;
  readonly icon: LucideIcon;
  readonly text: string;
}

/** What the Pass gets the member, from what they have today. */
const Perks = ({
  perks,
  title,
}: {
  readonly perks: Perk[];
  readonly title: string;
}) => (
  <section className="grid content-start gap-3">
    <h2 className="font-semibold">{title}</h2>
    <ul className="grid gap-2 text-sm">
      {perks.map((perk) => (
        <li className="flex items-start gap-2" key={perk.text}>
          <perk.icon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-pink-text"
          />
          {perk.href ? (
            <Link className="hover:underline" href={perk.href}>
              {perk.text}
            </Link>
          ) : (
            <span>{perk.text}</span>
          )}
        </li>
      ))}
    </ul>
  </section>
);

/**
 * The top of Your Pass: the live card (with the code that changes every 30
 * seconds), Google Wallet, the member's perks, their details, the
 * authenticator app, sign-out and, for staff, the back office.
 */
export const PassCard = async ({ session }: PassCardProps) => {
  const [locale, t, card] = await Promise.all([
    getLocale(),
    getTranslations("pass.home"),
    getTranslations("pass.card"),
  ]);
  // Everyone reads their own rows (RLS); staff see a link to the back office.
  const [
    { data: profile },
    { data: staff },
    { data: subscription },
    { data: bulbRows },
    { data: baghdad },
  ] = await Promise.all([
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
    session.supabase
      .from("subscriptions")
      .select(
        "status, plan:plans!inner (name, name_ar, rental_slots, audience, free_delivery)"
      )
      .eq("user_id", session.user.id)
      .eq("plan.audience", "plus")
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    session.supabase.rpc("my_bulbs"),
    session.supabase
      .from("delivery_zones")
      .select("free_from")
      .eq("governorate", "baghdad")
      .eq("active", true)
      .maybeSingle(),
  ]);
  const name = profile?.full_name?.trim();
  const phone = session.user.phone ? formatPhone(session.user.phone) : null;
  const plan = subscription?.plan ?? null;
  const bulbs = bulbRows?.[0] ?? null;
  let deliveryPerk = card("perks.delivery");
  if (plan?.free_delivery) {
    deliveryPerk = card("perks.freeDelivery");
  } else if (baghdad?.free_from) {
    deliveryPerk = card("perks.freeDeliveryFrom", {
      amount: formatPrice(baghdad.free_from, locale),
    });
  }

  const perks: Perk[] = [
    plan
      ? {
          href: "/plus#yours",
          icon: CrownIcon,
          text:
            plan.rental_slots === null
              ? card("perks.plusMember", { plan: planName(plan, locale) })
              : card("perks.plus", {
                  plan: planName(plan, locale),
                  slots: formatNumber(plan.rental_slots, locale),
                }),
        }
      : { href: "/plus", icon: CrownIcon, text: card("perks.joinPlus") },
    { icon: TruckIcon, text: deliveryPerk },
    {
      href: "/club?show=events",
      icon: CalendarDaysIcon,
      text: card("perks.events"),
    },
    {
      href: "/pass/orders#sell",
      icon: HandCoinsIcon,
      text: card("perks.sell"),
    },
    {
      href: "/pass/bulbs",
      icon: LightbulbIcon,
      text: card("perks.bulbs", {
        bulbs: formatNumber(bulbs?.available ?? 0, locale),
        rate: formatNumber(Number(bulbs?.rate ?? 0), locale, {
          maximumFractionDigits: 2,
        }),
      }),
    },
  ];

  return (
    <section className="grid gap-6 rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <div className="grid content-start gap-3">
          <LiveCard
            memberSince={
              profile
                ? t("memberSince", {
                    date: formatDate(profile.created_at, locale),
                  })
                : null
            }
            name={name || t("noName")}
            plan={plan ? planName(plan, locale) : null}
          />
          <WalletButton />
        </div>
        <Perks perks={perks} title={card("perks.title")} />
      </div>
      <div className="grid gap-4 border-t pt-4 md:grid-cols-[1fr_auto]">
        <dl className="grid content-start gap-2 text-sm">
          {session.user.email ? (
            <Row label={t("emailLabel")}>
              {/* Addresses read left-to-right in Arabic too. */}
              <span className="truncate" dir="ltr">
                {session.user.email}
              </span>
            </Row>
          ) : null}
          {/* Members from the phone sign-in days still show their number. */}
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
        <div className="grid content-start gap-2 md:w-56">
          {staff ? (
            <Button asChild variant="outline">
              <a href={appLink(env.NEXT_PUBLIC_APP_URL, locale, "/staff")}>
                {t("backOffice")}
                <ExternalLinkIcon className="rtl:-scale-x-100" />
              </a>
            </Button>
          ) : null}
          <SignOutButton className="w-full" variant="ghost" />
        </div>
      </div>
    </section>
  );
};
