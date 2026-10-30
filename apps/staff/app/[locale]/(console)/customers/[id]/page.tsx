import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, Panel } from "@/components/admin/page";
import { RecordHeader } from "@/components/admin/record-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { parseAddress } from "@/lib/admin/address";
import { type Formatters, formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { canRead, canWrite as canWriteSection } from "@/lib/admin/roles";
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
import { SupportPanel } from "./support-panel";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.customers");
  return { title: t("detail") };
};

type Access = Record<
  "orders" | "rentals" | "subscription" | "support" | "telegram",
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
    tickets,
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
          .select("id, number, status, total, created_at, shipping_address", {
            count: "exact",
          })
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
            "id, status, current_period_end, cancel_at_period_end, plans!subscriptions_plan_id_fkey(name, audience, rental_slots)"
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
    can.support
      ? supabase
          .from("support_tickets")
          .select("id, number, subject, status, last_message_at", {
            count: "exact",
          })
          .eq("user_id", id)
          .order("last_message_at", { ascending: false })
          .limit(5)
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
    tickets,
  };
};

const optionalDateTime = (
  format: Formatters,
  iso: string | null | undefined
) => (iso ? format.dateTime(iso) : null);

type Loaded = Awaited<ReturnType<typeof loadCustomer>>;

/** Orders, rentals and support tickets, each when the role reads them. */
const ActivityColumn = ({
  canOpenTickets,
  format,
  id,
  locale,
  orders,
  rentals,
  tickets,
}: {
  readonly canOpenTickets: boolean;
  readonly format: Formatters;
  readonly id: string;
  readonly locale: Locale;
  readonly orders: Loaded["orders"];
  readonly rentals: Loaded["rentals"];
  readonly tickets: Loaded["tickets"];
}) => (
  <div className="grid content-start gap-6">
    {orders ? (
      <div className="scroll-mt-4" id="orders">
        <OrdersPanel format={format} id={id} orders={orders.data ?? []} />
      </div>
    ) : null}

    {rentals ? (
      <div className="scroll-mt-4" id="rentals">
        <RentalsPanel
          format={format}
          locale={locale}
          rentals={rentals.data ?? []}
        />
      </div>
    ) : null}

    {tickets ? (
      <div className="scroll-mt-4" id="support">
        <SupportPanel
          canOpen={canOpenTickets}
          customerId={id}
          format={format}
          orders={orders?.data ?? []}
          tickets={tickets.data ?? []}
        />
      </div>
    ) : null}
  </div>
);

/**
 * The customer's record header: name, suspended and staff chips, Suspend,
 * how many orders and tickets, and the parts of the page.
 */
const CustomerHeader = async ({
  canSuspend,
  format,
  loaded: { orders, profile, rentals, staffRow, tickets },
}: {
  readonly canSuspend: boolean;
  readonly format: Formatters;
  readonly loaded: Pick<
    Loaded,
    "orders" | "rentals" | "staffRow" | "tickets"
  > & { profile: NonNullable<Loaded["profile"]> };
}) => {
  const t = await getTranslations("admin.customers");
  const tRoles = await getTranslations("admin.roles");
  const counted = (
    list: { count: number | null } | null,
    href: string,
    label: string
  ) => (list ? [{ href, label, value: format.number(list.count ?? 0) }] : []);
  const tab = (shown: unknown, href: string, label: string) =>
    shown ? [{ href, label }] : [];

  return (
    <RecordHeader
      actions={
        canSuspend ? (
          <SuspendButton bannedAt={profile.banned_at} id={profile.id} />
        ) : null
      }
      breadcrumb={[{ href: "/customers", label: t("title") }]}
      chips={
        <>
          {profile.banned_at ? (
            <StatusBadge tone="danger">{t("suspended")}</StatusBadge>
          ) : null}
          {staffRow ? (
            <StatusBadge tone="brand">
              {t("staffMember", { role: tRoles(staffRow.role) })}
            </StatusBadge>
          ) : null}
        </>
      }
      description={t("joinedOn", { date: format.date(profile.created_at) })}
      numbers={[
        ...counted(orders, "#orders", t("ordersCount")),
        ...counted(tickets, "#support", t("ticketsCount")),
        { label: t("joined"), value: format.date(profile.created_at) },
      ]}
      tabs={[
        ...tab(orders, "#orders", t("tabs.orders")),
        ...tab(rentals, "#rentals", t("tabs.rentals")),
        ...tab(tickets, "#support", t("tabs.support")),
        { href: "#profile", label: t("tabs.profile") },
      ]}
      title={profile.full_name || t("unnamed")}
    />
  );
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
  const format = formatters(locale);
  const can = {
    orders: canRead(staff.role, "orders"),
    rentals: canRead(staff.role, "rentals"),
    subscription:
      canRead(staff.role, "rentals") || canRead(staff.role, "finance"),
    support: canRead(staff.role, "support"),
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
    tickets,
  } = await loadCustomer(supabase, id, can);

  if (!profile) {
    notFound();
  }

  const lastPhone = parseAddress(orders?.data?.[0]?.shipping_address).phone;
  const isStaff = Boolean(staffRow);

  return (
    <>
      <CustomerHeader
        canSuspend={canWrite && !isStaff && id !== staff.userId}
        format={format}
        loaded={{ orders, profile, rentals, staffRow, tickets }}
      />
      <PageBody className="lg:grid-cols-[1fr_22rem]">
        <ActivityColumn
          canOpenTickets={canWriteSection(staff.role, "support")}
          format={format}
          id={id}
          locale={locale}
          orders={orders}
          rentals={rentals}
          tickets={tickets}
        />

        <div className="grid scroll-mt-4 content-start gap-6" id="profile">
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
