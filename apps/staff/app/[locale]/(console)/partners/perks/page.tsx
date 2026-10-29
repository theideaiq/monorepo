import { localized } from "@repo/commerce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { CompaniesTabs } from "../_components/companies-tabs";
import { AddPerkForm, PairPerkForm, PerkToggle } from "./forms";

const TIER_NAMES: Record<number, string> = {
  1: "Glow",
  2: "Shine",
  3: "Blaze",
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.companies.perks");
  return { title: t("title") };
};

/**
 * Partner perks on The IDEA Pass: who offers them (an organization in The
 * IDEA Partners, whose team checks cards from its dashboard), who they're
 * open to, and how often they were used this month.
 */
const PerksPage = async () => {
  const { canWrite, supabase } = await requireSection("companies");
  const locale = await getLocale();
  const t = await getTranslations("admin.companies.perks");
  const tCompanies = await getTranslations("admin.companies");
  const format = formatters(locale);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const [{ data: perks }, { data: organizations }, { data: uses }] =
    await Promise.all([
      supabase
        .from("perks")
        .select(
          "id, organization_id, partner_name, kind, title_ar, title_en, audience, plus_tiers, paired_with, active"
        )
        .order("partner_name")
        .order("position"),
      supabase.from("organizations").select("id, name").order("name"),
      supabase
        .from("perk_redemptions")
        .select("perk_id")
        .gte("redeemed_on", monthStart.toISOString().slice(0, 10)),
    ]);
  const count = new Map<string, number>();
  for (const use of uses ?? []) {
    count.set(use.perk_id, (count.get(use.perk_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader title={tCompanies("title")} />
      <CompaniesTabs />
      <PageBody>
        {(perks ?? []).length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("partner")}</TableHead>
                  <TableHead>{t("perk")}</TableHead>
                  <TableHead>{t("audience")}</TableHead>
                  <TableHead className="text-end">{t("thisMonth")}</TableHead>
                  {canWrite ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(perks ?? []).map((perk) => (
                  <TableRow key={perk.id}>
                    <TableCell>
                      {perk.partner_name}
                      <span className="block text-muted-foreground text-xs">
                        {t(`kinds.${perk.kind as "other"}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {localized(perk, "title", locale)}
                      {perk.active ? null : (
                        <StatusBadge className="ms-2" tone="neutral">
                          {t("stopped")}
                        </StatusBadge>
                      )}
                    </TableCell>
                    <TableCell>
                      {t(`audiences.${perk.audience as "everyone"}`)}
                      {perk.plus_tiers?.length ? (
                        <span className="block text-muted-foreground text-xs">
                          {perk.plus_tiers
                            .map((tier) => TIER_NAMES[tier])
                            .join(" · ")}
                        </span>
                      ) : null}
                      {canWrite ? (
                        <PairPerkForm
                          current={perk.paired_with}
                          id={perk.id}
                          options={(perks ?? [])
                            .filter(
                              (other) =>
                                other.id !== perk.id &&
                                other.organization_id === perk.organization_id
                            )
                            .map((other) => ({
                              label: localized(other, "title", locale),
                              value: other.id,
                            }))}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.number(count.get(perk.id) ?? 0)}
                    </TableCell>
                    {canWrite ? (
                      <TableCell className="text-end">
                        <PerkToggle active={perk.active} id={perk.id} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {canWrite ? (
          <Panel description={t("newDescription")} title={t("new")}>
            <AddPerkForm
              organizations={(organizations ?? []).map((organization) => ({
                label: organization.name,
                value: organization.id,
              }))}
            />
          </Panel>
        ) : null}
      </PageBody>
    </>
  );
};

export default PerksPage;
