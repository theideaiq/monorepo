import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { parseAddress } from "@/lib/admin/address";
import { type Formatters, formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { canRead } from "@/lib/admin/roles";
import { requireSection, type ServerClient } from "@/lib/admin/session";
import { BulbsPanel } from "./bulbs-panel";
import { CrmForm } from "./crm-form";
import {
  OrdersPanel,
  ProfilePanel,
  RentalsPanel,
  SubscriptionsPanel,
  SuspendButton,
} from "./panels";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.customers");
  return { title: t("detail") };
};

type Access = Record<
  "orders" | "rentals" | "subscription" | "telegram",
  boolean
>;

/** Everything shown about a customer, each part only if the role reads it. */
const loadCustomer = async (
  supabase: ServerClient,
  id: string,
  can: Access
) => {
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

  return {
    contact,
    orders,
    profile,
    rentals,
    staffRow,
    subscriptions,
    telegram,
  };
};

const optionalDateTime = (
  format: Formatters,
  iso: string | null | undefined
) => (iso ? format.dateTime(iso) : null);

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
  const tRoles = await getTranslations("admin.roles");
  const format = formatters(locale);
  const can = {
    orders: canRead(staff.role, "orders"),
    rentals: canRead(staff.role, "rentals"),
    subscription:
      canRead(staff.role, "rentals") || canRead(staff.role, "finance"),
    telegram: canRead(staff.role, "telegram"),
  };
  const {
    contact,
    orders,
    profile,
    rentals,
    staffRow,
    subscriptions,
    telegram,
  } = await loadCustomer(supabase, id, can);

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
          <SuspendButton bannedAt={profile.banned_at} id={id} />
        ) : null}
      </PageHeader>
      <PageBody className="lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          {orders ? (
            <OrdersPanel format={format} id={id} orders={orders.data ?? []} />
          ) : null}

          {rentals ? (
            <RentalsPanel
              format={format}
              locale={locale}
              rentals={rentals.data ?? []}
            />
          ) : null}
        </div>

        <div className="grid content-start gap-6">
          <ProfilePanel
            lastPhone={lastPhone}
            profile={profile}
            telegram={telegram ? { member: telegram.data } : null}
          />

          <BulbsPanel
            canAdjust={canWrite}
            format={format}
            supabase={supabase}
            userId={id}
          />

          {subscriptions ? (
            <SubscriptionsPanel
              format={format}
              subscriptions={subscriptions.data ?? []}
            />
          ) : null}

          <Panel title={t("crm")}>
            <CrmForm
              disabled={!canWrite}
              lastContactedAt={contact?.last_contacted_at ?? null}
              lastContactedLabel={optionalDateTime(
                format,
                contact?.last_contacted_at
              )}
              notes={contact?.notes ?? null}
              status={contact?.status ?? "lead"}
              tags={contact?.tags ?? []}
              updatedAt={contact ? format.dateTime(contact.updated_at) : null}
              userId={id}
            />
          </Panel>
        </div>
      </PageBody>
    </>
  );
};

export default CustomerPage;
