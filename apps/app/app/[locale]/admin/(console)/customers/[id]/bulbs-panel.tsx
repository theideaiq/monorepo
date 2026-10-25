import { getTranslations } from "next-intl/server";
import { Panel } from "@/components/admin/page";
import type { Formatters } from "@/lib/admin/format";
import type { ServerClient } from "@/lib/admin/session";
import { BulbsAdjustForm } from "./bulbs-adjust-form";

/**
 * The member's Bulbs: what they can use and what's pending, their tier,
 * the latest movements and an adjustment with a reason. Only for staff who
 * may change customers (support and admins); marketing doesn't see Bulbs.
 */
export const BulbsPanel = async ({
  canAdjust,
  format,
  supabase,
  userId,
}: {
  readonly canAdjust: boolean;
  readonly format: Formatters;
  readonly supabase: ServerClient;
  readonly userId: string;
}) => {
  if (!canAdjust) {
    return null;
  }
  const t = await getTranslations("admin.customers.bulbs");
  const tBulbs = await getTranslations("app.bulbs");
  const [{ data: summary }, { data: entries }] = await Promise.all([
    supabase.rpc("member_bulbs", { member: userId }),
    supabase
      .from("bulb_entries")
      .select("id, amount, kind, status, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const bulbs = summary?.[0];

  return (
    <Panel title={t("title")}>
      {bulbs ? (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">{t("available")}</dt>
          <dd className="text-end font-medium tabular-nums">
            {format.number(bulbs.available)}
          </dd>
          <dt className="text-muted-foreground">{t("pending")}</dt>
          <dd className="text-end tabular-nums">
            {format.number(bulbs.pending)}
          </dd>
          <dt className="text-muted-foreground">{t("tier")}</dt>
          <dd className="text-end">
            {tBulbs(`tiers.${bulbs.tier}.name`)} ·{" "}
            {format.number(Number(bulbs.rate))}%
          </dd>
          <dt className="text-muted-foreground">{t("spend")}</dt>
          <dd className="text-end tabular-nums">{format.money(bulbs.spend)}</dd>
        </dl>
      ) : null}
      {(entries ?? []).length > 0 ? (
        <ul className="grid gap-1 border-t pt-3 text-xs">
          {(entries ?? []).map((entry) => (
            <li
              className="flex items-center justify-between gap-2"
              key={entry.id}
            >
              <span className="min-w-0 truncate">
                {tBulbs(`kinds.${entry.kind}`)}
                {entry.reason && entry.kind === "adjustment"
                  ? ` · ${entry.reason}`
                  : ""}
                {" · "}
                {format.date(entry.created_at)}
              </span>
              <span
                className={
                  entry.status === "void"
                    ? "text-muted-foreground line-through"
                    : "tabular-nums"
                }
                dir="ltr"
              >
                {entry.amount > 0 ? "+" : "−"}
                {format.number(Math.abs(entry.amount))}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <BulbsAdjustForm userId={userId} />
    </Panel>
  );
};
