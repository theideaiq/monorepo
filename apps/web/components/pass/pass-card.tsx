import { formatPhone } from "@repo/auth/phone";
import { formatPrice, planName } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import {
  CalendarDaysIcon,
  CrownIcon,
  ExternalLinkIcon,
  GraduationCapIcon,
  LightbulbIcon,
  type LucideIcon,
  TruckIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { env } from "@/env";
import { appLink } from "@/lib/links";
import type { PassSession } from "@/lib/pass/session";
import { LiveCard } from "./live-card";
import { PartnerPerks } from "./partner-perks";
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

type CardText = Awaited<ReturnType<typeof getTranslations<"pass.card">>>;

/** Verified until a date, or how to verify (Settings). */
const studentPerk = (
  student: { valid_until: string | null; verified: boolean } | null,
  card: CardText,
  locale: Locale
): Perk => ({
  href: "/pass/settings#student",
  icon: GraduationCapIcon,
  text: student?.verified
    ? card("perks.student", {
        date: formatDate(student.valid_until ?? "", locale),
      })
    : card("perks.verifyStudent"),
});

/** The contributor badge: counted survey answers (10, 50 or 200), from `my_survey_record()`. */
const contributorLevel = (record: unknown) => {
  const level = Number((record as { level?: unknown } | null)?.level);
  return Number.isFinite(level) ? level : 0;
};

/** The badges on the card (the Plus plan shows on its own). */
const cardBadges = (
  student: boolean,
  educator: boolean,
  staff: boolean,
  contributor: number,
  card: CardText,
  locale: Locale
) => [
  ...(student ? [card("badges.student")] : []),
  ...(educator && !student ? [card("badges.educator")] : []),
  ...(contributor > 0
    ? [card("badges.contributor", { level: formatNumber(contributor, locale) })]
    : []),
  ...(staff ? [card("badges.staff")] : []),
];

/**
 * The top of Your Pass: the live card (with the code that changes every 30
 * seconds), Google Wallet, the member's perks, their details, the
 * authenticator app, sign-out and, for staff, Staff.
 */
export const PassCard = async ({ session }: PassCardProps) => {
  const [locale, t, card] = await Promise.all([
    getLocale(),
    getTranslations("pass.home"),
    getTranslations("pass.card"),
  ]);
  // Everyone reads their own rows (RLS); staff see a link to Staff.
  const [
    { data: profile },
    { data: staff },
    { data: subscription },
    { data: bulbRows },
    { data: baghdad },
    { data: student },
    { data: offers },
    { data: record },
    { data: educator },
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
        "status, plan:plans!subscriptions_plan_id_fkey!inner (name, name_ar, rental_slots, audience, free_delivery)"
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
    session.supabase.rpc("my_student").maybeSingle(),
    session.supabase.rpc("my_perks"),
    session.supabase.rpc("my_survey_record"),
    session.supabase
      .from("educator_badges")
      .select("valid_until")
      .eq("user_id", session.user.id)
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
    studentPerk(student, card, locale),
    {
      href: "/club?show=events#join",
      icon: CalendarDaysIcon,
      text: card("perks.events"),
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
            badges={cardBadges(
              Boolean(student?.verified),
              Boolean(
                educator &&
                  educator.valid_until >= new Date().toISOString().slice(0, 10)
              ),
              Boolean(staff),
              contributorLevel(record),
              card,
              locale
            )}
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
      <PartnerPerks locale={locale} perks={offers ?? []} />
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
          {staff && env.NEXT_PUBLIC_STAFF_URL ? (
            <Button asChild variant="outline">
              <a href={appLink(env.NEXT_PUBLIC_STAFF_URL, locale, "/")}>
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
