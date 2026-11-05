import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { titleFrom } from "@/lib/app-metadata";
import { getPassSession } from "@/lib/pass/session";
import { baghdadYear, COUNTED_ORDER_STATUSES, earnedBulbs } from "@/lib/year";

export const generateMetadata = titleFrom((t) => t("app.pass.year.title"));

/**
 * `/pass/year` (A4): Your year at The IDEA, from the member's own records
 * (RLS): orders, Plus rentals, Club events they checked in at, and Bulbs
 * earned since 1 January in Baghdad. Only real numbers; nothing to show
 * says so.
 */
const YearPage = async () => {
  const [locale, session] = await Promise.all([
    getLocale() as Promise<Locale>,
    getPassSession(),
  ]);
  if (!session) {
    redirect(
      `${localePath(locale, "/sign-in")}?${new URLSearchParams({ return_to: localePath(locale, "/pass/year") })}`
    );
  }
  const { start, year } = baghdadYear();
  const { supabase, user } = session;
  const [t, orders, rentals, events, bulbs] = await Promise.all([
    getTranslations("app.pass.year"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", [...COUNTED_ORDER_STATUSES])
      .gte("created_at", start),
    supabase
      .from("rentals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("kind", "plus")
      .gte("started_at", start),
    supabase
      .from("event_rsvps")
      .select("event_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("checked_in_at", start),
    supabase
      .from("bulb_entries")
      .select("amount, kind, status")
      .eq("user_id", user.id)
      .gte("created_at", start)
      .limit(5000),
  ]);
  const numbers = [
    { key: "orders", value: orders.count ?? 0 },
    { key: "rentals", value: rentals.count ?? 0 },
    { key: "events", value: events.count ?? 0 },
    { key: "bulbs", value: earnedBulbs(bulbs.data ?? []) },
  ] as const;
  const empty = numbers.every((item) => item.value === 0);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="grid max-w-3xl gap-6">
        <p className="text-muted-foreground">
          {t("intro", { year: String(year) })}
        </p>
        {empty ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3">
            {numbers.map((item) => (
              <div className="grid gap-1 rounded-lg border p-4" key={item.key}>
                <dt className="text-muted-foreground text-sm">
                  {t(`numbers.${item.key}`)}
                </dt>
                <dd className="font-bold font-mono text-3xl tabular-nums">
                  {formatNumber(item.value, locale)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </>
  );
};

export default YearPage;
