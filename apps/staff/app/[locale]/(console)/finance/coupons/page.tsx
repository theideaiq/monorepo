import type { Tables } from "@repo/database";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { type Formatters, formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { CouponForm } from "../_components/coupon-form";
import { FinanceTabs } from "../_components/finance-tabs";
import { setCouponActive } from "../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.coupons");
  return { title: t("title") };
};

type Coupon = Pick<
  Tables<"coupons">,
  | "active"
  | "amount"
  | "code"
  | "description"
  | "ends_at"
  | "id"
  | "kind"
  | "max_discount"
  | "max_uses"
  | "min_subtotal"
  | "starts_at"
  | "uses_per_member"
>;

interface CouponRowProps {
  readonly canWrite: boolean;
  readonly coupon: Coupon;
  readonly format: Formatters;
  readonly t: Awaited<
    ReturnType<typeof getTranslations<"admin.finance.coupons">>
  >;
  /** Orders placed with it, cancelled ones aside. */
  readonly used: number;
}

const CouponRow = ({ canWrite, coupon, format, t, used }: CouponRowProps) => (
  <li className="grid gap-2 rounded-lg border p-4">
    <div className="flex flex-wrap items-center gap-2">
      <p className="font-medium font-mono" dir="ltr">
        {coupon.code}
      </p>
      <span className="text-muted-foreground text-sm">
        {coupon.active ? t("active") : t("inactive")}
      </span>
    </div>
    <p className="text-sm">
      {coupon.kind === "percent"
        ? t("percentOff", { rate: format.number(coupon.amount) })
        : t("amountOff", {
            amount: format.money(coupon.amount),
          })}
      {coupon.max_discount
        ? ` · ${t("upTo", { amount: format.money(coupon.max_discount) })}`
        : ""}
      {coupon.min_subtotal > 0
        ? ` · ${t("minimum", { amount: format.money(coupon.min_subtotal) })}`
        : ""}
    </p>
    <p className="text-muted-foreground text-sm">
      {coupon.ends_at
        ? t("dates", {
            ends: format.dateTime(coupon.ends_at),
            starts: format.dateTime(coupon.starts_at),
          })
        : t("from", { starts: format.dateTime(coupon.starts_at) })}
      {" · "}
      {t(coupon.max_uses ? "usesOf" : "uses", {
        max: format.number(coupon.max_uses ?? 0),
        perMember: format.number(coupon.uses_per_member),
        used: format.number(used),
      })}
    </p>
    {coupon.description ? (
      <p className="text-sm">{coupon.description}</p>
    ) : null}
    {canWrite ? (
      <div>
        <ActionButton
          action={setCouponActive}
          fields={{
            active: String(!coupon.active),
            id: coupon.id,
          }}
        >
          {coupon.active ? t("deactivate") : t("activate")}
        </ActionButton>
      </div>
    ) : null}
  </li>
);

/**
 * Finance → Coupons: codes The IDEA pays for, newest first, with how many
 * orders used each (cancelled ones aside). Members apply them at checkout.
 */
const CouponsPage = async () => {
  const { canWrite, supabase } = await requireSection("finance");
  const locale = await getLocale();
  const t = await getTranslations("admin.finance.coupons");
  const format = formatters(locale);

  const [{ data: coupons }, { data: used }] = await Promise.all([
    supabase
      .from("coupons")
      .select(
        "id, code, description, kind, amount, max_discount, min_subtotal, starts_at, ends_at, max_uses, uses_per_member, active"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("orders")
      .select("coupon_id")
      .not("coupon_id", "is", null)
      .neq("status", "cancelled"),
  ]);
  const uses = new Map<string, number>();
  for (const order of used ?? []) {
    if (order.coupon_id) {
      uses.set(order.coupon_id, (uses.get(order.coupon_id) ?? 0) + 1);
    }
  }

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <FinanceTabs />
      <PageBody>
        {canWrite ? (
          <section className="grid gap-3 rounded-lg border p-4">
            <h2 className="font-semibold text-lg">{t("newTitle")}</h2>
            <CouponForm />
          </section>
        ) : null}
        {(coupons ?? []).length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <ul className="grid gap-3">
            {(coupons ?? []).map((coupon) => (
              <CouponRow
                canWrite={canWrite}
                coupon={coupon}
                format={format}
                key={coupon.id}
                t={t}
                used={uses.get(coupon.id) ?? 0}
              />
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
};

export default CouponsPage;
