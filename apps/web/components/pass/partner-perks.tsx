import { localized } from "@repo/commerce";
import type { Json } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import type { PerkAudience } from "@/lib/students";

/** A perk as `my_perks()` gives it to the member. */
interface PerkRow {
  area_ar: string;
  area_en: string;
  audience: string;
  details_ar: string;
  details_en: string;
  id: string;
  /** Open to this member (audience and, for Plus, tier). */
  open: boolean;
  partner_name: string;
  /** For a Plus perk, the tiers it's for (1 Glow, 2 Shine, 3 Blaze). */
  plus_tiers: number[] | null;
  title_ar: string;
  title_en: string;
  /** Its paired perk that's better and not theirs yet. */
  upgrade: Json | null;
}

const TIERS: Record<number, string> = { 1: "Glow", 2: "Shine", 3: "Blaze" };

interface Upgrade {
  audience: PerkAudience;
  title_ar: string;
  title_en: string;
}

const asUpgrade = (value: Json | null): Upgrade | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as unknown as Upgrade)
    : null;

type Translate = Awaited<
  ReturnType<typeof getTranslations<"pass.partnerPerks">>
>;

const tierNames = (tiers: readonly number[]) =>
  tiers.map((tier) => TIERS[tier]).join(" · ");

const linkClass = "font-medium text-pink-text text-xs hover:underline";

/** Where to get a perk that isn't the member's yet. */
const pathFor = (audience: PerkAudience) =>
  audience === "students" ? "/verify?kind=student" : "/plus";

/** Who the perk is for: students, Plus, or some Plus tiers. */
const audienceLabel = (perk: PerkRow, t: Translate) =>
  perk.plus_tiers?.length
    ? t("audience.plusTiers", { tiers: tierNames(perk.plus_tiers) })
    : t(`audience.${perk.audience as "plus" | "students"}`);

/** How to get a perk the member can't use yet. */
const closedLabel = (perk: PerkRow, t: Translate) => {
  if (perk.plus_tiers?.length) {
    return t("tierToUse", { tiers: tierNames(perk.plus_tiers) });
  }
  return t(perk.audience === "students" ? "verifyToUse" : "joinToUse");
};

const PerkCard = ({
  locale,
  perk,
  t,
}: {
  readonly locale: string;
  readonly perk: PerkRow;
  readonly t: Translate;
}) => {
  const audience = perk.audience as PerkAudience;
  const upgrade = asUpgrade(perk.upgrade);
  const area = localized(perk, "area", locale);
  const details = localized(perk, "details", locale);
  return (
    <li className="grid content-start gap-1 rounded-lg border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{localized(perk, "title", locale)}</p>
        {audience === "everyone" ? null : (
          <Badge variant={perk.open ? "default" : "outline"}>
            {audienceLabel(perk, t)}
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground">
        {area ? `${perk.partner_name} · ${area}` : perk.partner_name}
      </p>
      {details ? <p>{details}</p> : null}
      {upgrade ? (
        <Link className={linkClass} href={pathFor(upgrade.audience)}>
          {t(
            upgrade.audience === "students" ? "upgradeStudents" : "upgradePlus",
            { title: localized(upgrade, "title", locale) }
          )}
        </Link>
      ) : null}
      {perk.open ? null : (
        <Link className={linkClass} href={pathFor(audience)}>
          {closedLabel(perk, t)}
        </Link>
      )}
    </li>
  );
};

/**
 * Partner perks on Your Pass: each with who it's open to, and, of a pair,
 * the better one the member gets ("With Plus: 20%" when the better one
 * isn't theirs yet). The partner checks the card at their counter.
 */
export const PartnerPerks = async ({
  locale,
  perks,
}: {
  readonly locale: string;
  readonly perks: readonly PerkRow[];
}) => {
  const t = await getTranslations("pass.partnerPerks");
  if (perks.length === 0) {
    return null;
  }
  return (
    <section className="grid gap-3 border-t pt-4">
      <div className="grid gap-1">
        <h2 className="font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {perks.map((perk) => (
          <PerkCard key={perk.id} locale={locale} perk={perk} t={t} />
        ))}
      </ul>
    </section>
  );
};
