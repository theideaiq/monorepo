import { localized } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { type MemberBadges, type PerkAudience, perkOpen } from "@/lib/students";

interface PerkRow {
  area_ar: string;
  area_en: string;
  audience: string;
  details_ar: string;
  details_en: string;
  id: string;
  partner_name: string;
  title_ar: string;
  title_en: string;
}

/**
 * Partner perks on Your Pass: each with who it's open to. The partner
 * checks the card at their counter.
 */
export const PartnerPerks = async ({
  badges,
  locale,
  perks,
}: {
  readonly badges: MemberBadges;
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
        {perks.map((perk) => {
          const audience = perk.audience as PerkAudience;
          const open = perkOpen(audience, badges);
          const area = localized(perk, "area", locale);
          const details = localized(perk, "details", locale);
          return (
            <li
              className="grid content-start gap-1 rounded-lg border p-3 text-sm"
              key={perk.id}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  {localized(perk, "title", locale)}
                </p>
                {audience === "everyone" ? null : (
                  <Badge variant={open ? "default" : "outline"}>
                    {t(`audience.${audience}`)}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {area ? `${perk.partner_name} · ${area}` : perk.partner_name}
              </p>
              {details ? <p>{details}</p> : null}
              {open ? null : (
                <Link
                  className="font-medium text-pink-text text-xs hover:underline"
                  href={
                    audience === "students" ? "/pass/settings#student" : "/plus"
                  }
                >
                  {t(audience === "students" ? "verifyToUse" : "joinToUse")}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
