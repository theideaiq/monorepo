import { localized } from "@repo/commerce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/action-button";
import { DetailList, PageBody, PageHeader, Panel } from "@/components/page";
import { StatusBadge } from "@/components/status-badge";
import { parseAddress } from "@/lib/address";
import { formatters } from "@/lib/format";
import { isUuid } from "@/lib/list";
import { canRead } from "@/lib/roles";
import { requireSection } from "@/lib/session";
import { setSuspended } from "../actions";
import { CrmForm } from "./crm-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.customers");
  return { title: t("detail") };
};

const CustomerPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { canWrite, staff, supabase } = await requireSection("customers");
  const locale = await getLocale();
  const t = await getTranslations("admin.customers");
  const tStore = await getTranslations("store");
  const tBilling = await getTranslations("billing.status");
  const tRoles = await getTranslations("admin.roles");
  const format = formatters(locale);
  const can = {
    orders: canRead(staff.role, "orders"),
    rentals: canRead(staff.role, "rentals"),
    subscription:
      canRead(staff.role, "rentals") || canRead(staff.role, "finance"),
    telegram: canRead(staff.role, "telegram"),
  };
  const none = Promise.resolve(null);

  const [
    { data: profile },
    { data: contact },
    { data: staffRow },
    orders,
    rentals,
    subscriptions,
    telegram,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, locale, created_at, banned_at, marketing_opt_in")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("crm_contacts").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("staff").select("role").eq("user_id", id).maybeSingle(),
    can.orders
      ? supabase
          .from("orders")
          .select("id, number, status, total, created_at, shipping_address")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(20)
      : none,
    can.rentals
      ? supabase
          .from("rentals")
          .select("id, name_ar, name_en, status, requested_at, due_at")
          .eq("user_id", id)
          .order("requested_at", { ascending: false })
          .limit(20)
      : none,
    can.subscription
      ? supabase
          .from("subscriptions")
          .select(
            "id, status, current_period_end, cancel_at_period_end, plans(name, audience, rental_slots)"
          )
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(5)
      : none,
    can.telegram
      ? supabase
          .from("telegram_members")
          .select("id, username, first_name, banned_at")
          .eq("user_id", id)
          .maybeSingle()
      : none,
  ]);

  if (!profile) {
    notFound();
  }

  const lastPhone = parseAddress(orders?.data?.[0]?.shipping_address).phone;
  const isStaff = Boolean(staffRow);
  const canSuspend = canWrite && !isStaff && id !== staff.userId;

  return (
    <>
      <PageHeader
        back={{ href: "/customers", label: t("title") }}
        description={t("joinedOn", { date: format.date(profile.created_at) })}
        title={profile.full_name || t("unnamed")}
      >
        {profile.banned_at ? (
          <StatusBadge tone="danger">{t("suspended")}</StatusBadge>
        ) : null}
        {staffRow ? (
          <StatusBadge tone="brand">
            {t("staffMember", { role: tRoles(staffRow.role) })}
          </StatusBadge>
        ) : null}
        {canSuspend ? (
          <ActionButton
            action={setSuspended}
            confirm={{
              description: profile.banned_at
                ? undefined
                : t("suspendDescription"),
              title: profile.banned_at
                ? t("unsuspendConfirm")
                : t("suspendConfirm"),
            }}
            fields={{
              suspend: profile.banned_at ? "false" : "true",
              userId: id,
            }}
            variant={profile.banned_at ? "outline" : "destructive"}
          >
            {profile.banned_at ? t("unsuspend") : t("suspend")}
          </ActionButton>
        ) : null}
      </PageHeader>
      <PageBody className="lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          {orders ? (
            <Panel
              actions={
                <Link
                  className="text-primary text-sm hover:underline"
                  href={`/orders?customer=${id}`}
                >
                  {t("allOrders")}
                </Link>
              }
              title={t("orders")}
            >
              {(orders.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("noOrders")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("order")}</TableHead>
                      <TableHead>{t("date")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead className="text-end">{t("total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(orders.data ?? []).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link
                            className="font-medium hover:underline"
                            dir="ltr"
                            href={`/orders/${order.id}`}
                          >
                            #{order.number}
                          </Link>
                        </TableCell>
                        <TableCell>{format.date(order.created_at)}</TableCell>
                        <TableCell>
                          <StatusBadge status={order.status}>
                            {tStore(`orderStatus.${order.status}`)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {format.money(order.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          ) : null}

          {rentals ? (
            <Panel title={t("rentals")}>
              {(rentals.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("noRentals")}
                </p>
              ) : (
                <ul className="grid gap-2 text-sm">
                  {(rentals.data ?? []).map((rental) => (
                    <li
                      className="flex flex-wrap items-center justify-between gap-2"
                      key={rental.id}
                    >
                      <span>{localized(rental, "name", locale)}</span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {format.date(rental.due_at ?? rental.requested_at)}
                        <StatusBadge status={rental.status}>
                          {tStore(`rentalStatus.${rental.status}`)}
                        </StatusBadge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}
        </div>

        <div className="grid content-start gap-6">
          <Panel title={t("profile")}>
            <DetailList
              items={[
                {
                  label: t("language"),
                  value:
                    profile.locale === "en"
                      ? t("languages.en")
                      : t("languages.ar"),
                },
                {
                  label: t("optIn"),
                  value: profile.marketing_opt_in
                    ? t("optedIn")
                    : t("notOptedIn"),
                },
                {
                  label: t("phone"),
                  value: lastPhone ? (
                    <a className="hover:underline" dir="ltr" href={`tel:${lastPhone}`}>
                      {lastPhone}
                    </a>
                  ) : (
                    "—"
                  ),
                },
                ...(telegram
                  ? [
                      {
                        label: t("telegram"),
                        value: telegram.data ? (
                          <span dir="ltr">
                            {telegram.data.username
                              ? `@${telegram.data.username}`
                              : (telegram.data.first_name ?? telegram.data.id)}
                          </span>
                        ) : (
                          "—"
                        ),
                      },
                    ]
                  : []),
                {
                  label: t("userId"),
                  value: (
                    <code className="break-all text-xs" dir="ltr">
                      {profile.id}
                    </code>
                  ),
                },
              ]}
            />
          </Panel>

          {subscriptions ? (
            <Panel title={t("subscription")}>
              {(subscriptions.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("noSubscription")}
                </p>
              ) : (
                <ul className="grid gap-3 text-sm">
                  {(subscriptions.data ?? []).map((subscription) => (
                    <li className="grid gap-1" key={subscription.id}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {subscription.plans?.name ?? "—"}
                        </span>
                        <StatusBadge status={subscription.status}>
                          {tBilling(subscription.status)}
                        </StatusBadge>
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {subscription.cancel_at_period_end
                          ? t("endsOn", {
                              date: format.date(subscription.current_period_end),
                            })
                          : t("renewsOn", {
                              date: format.date(subscription.current_period_end),
                            })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}

          <Panel title={t("crm")}>
            <CrmForm
              disabled={!canWrite}
              notes={contact?.notes ?? null}
              status={contact?.status ?? "lead"}
              tags={contact?.tags ?? []}
              updatedAt={
                contact ? format.dateTime(contact.updated_at) : null
              }
              userId={id}
            />
          </Panel>
        </div>
      </PageBody>
    </>
  );
};

export default CustomerPage;
