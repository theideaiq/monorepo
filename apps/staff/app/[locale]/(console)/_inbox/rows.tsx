import "server-only";

import { formatPrice, localized } from "@repo/commerce";
import type { StaffRole } from "@repo/database";
import type { Locale } from "@repo/internationalization";
import {
  fileNameOf,
  getOrganizationFileUrl,
  getReturnPhotoUrl,
  getStudentCardUrl,
  getStudentDocumentUrl,
  getVerificationFileUrl,
} from "@repo/storage";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { DetailList, MaybeLink } from "@/components/admin/page";
import { ProductCover } from "@/components/admin/product-cover";
import { SignedFiles, signAll } from "@/components/admin/signed-files";
import { StatusBadge } from "@/components/admin/status-badge";
import { env } from "@/env";
import { academicYearEnd } from "@/lib/admin/dates";
import { type Formatters, formatters } from "@/lib/admin/format";
import { seesMoney } from "@/lib/admin/inbox";
import {
  type InboxKind,
  type InboxRow,
  visibleKinds,
} from "@/lib/admin/inbox-kinds";
import { profileNames } from "@/lib/admin/profiles";
import { canRead, canWrite } from "@/lib/admin/roles";
import type { ServerClient } from "@/lib/admin/session";
import { ticketPriorityTone } from "@/lib/admin/support";
import { supportStaff } from "@/lib/admin/support-staff";
import {
  resolveProductCheck,
  resolveProductFlag,
} from "../catalog/checks/actions";
import { ReviewApplicationForm } from "../club/_components/application-forms";
import { AssignForm, DecisionForm } from "../club/_components/review-forms";
import {
  ReviewCardForm,
  ReviewDocumentForm,
} from "../customers/students/forms";
import {
  ReviewEducatorForm,
  ReviewIdentityForm,
  ReviewOrganizationForm,
} from "../customers/verifications/forms";
import { DecideReturnForm, RefundedForm } from "../orders/returns/forms";
import { DecideSellerForm, ShopKindForm } from "../partners/shops/forms";
import { ManageTicketForm, ReplyForm } from "../support/[id]/ticket-forms";

/** At most this many of each kind in the Inbox (oldest first). */
export const PER_KIND = 30;

/** A row of the Inbox with what its drawer shows: facts, then actions. */
export interface InboxItem {
  actions: ReactNode;
  facts: ReactNode;
  row: InboxRow;
}

export interface KindResult {
  items: InboxItem[];
  total: number;
}

interface Context {
  format: Formatters;
  locale: Locale;
  mine: string | null;
  role: StaffRole;
  supabase: ServerClient;
  t: Awaited<ReturnType<typeof getTranslations<"admin">>>;
  tStore: Awaited<ReturnType<typeof getTranslations<"store">>>;
}

const exact = { count: "exact" } as const;

const rowOf = (
  kind: InboxKind,
  row: Omit<InboxRow, "key" | "kind" | "assignee" | "assigneeName"> &
    Partial<Pick<InboxRow, "assignee" | "assigneeName">>
): InboxRow => ({
  assignee: null,
  assigneeName: null,
  ...row,
  key: `${kind}:${row.id}`,
  kind,
});

const one = <T,>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;

// ── Support ────────────────────────────────────────────────────────────────

const loadSupport = async ({
  format,
  role,
  supabase,
  mine,
  t,
}: Context): Promise<KindResult> => {
  let query = supabase
    .from("support_tickets")
    .select(
      "id, number, subject, topic, priority, user_id, assigned_to, last_message_at, created_at",
      exact
    )
    .eq("status", "open");
  if (mine) {
    query = query.eq("assigned_to", mine);
  }
  const [{ count, data }, team] = await Promise.all([
    query.order("last_message_at").limit(PER_KIND),
    supportStaff(supabase),
  ]);
  const tickets = data ?? [];
  const names = await profileNames(
    supabase,
    tickets.map((ticket) => ticket.user_id)
  );
  const teamNames = new Map(team.map((member) => [member.id, member.name]));
  const write = canWrite(role, "support");
  const linkCustomer = canRead(role, "customers");

  return {
    items: tickets.map((ticket) => {
      const customer = ticket.user_id
        ? names.get(ticket.user_id) || t("support.unnamedCustomer")
        : t("support.deletedCustomer");
      return {
        actions: write ? (
          <div className="grid gap-6">
            <ReplyForm closed={false} ticketId={ticket.id} />
            <ManageTicketForm
              assignedTo={ticket.assigned_to}
              disabled={false}
              priority={ticket.priority}
              status="open"
              team={team}
              ticketId={ticket.id}
            />
          </div>
        ) : null,
        facts: (
          <DetailList
            items={[
              {
                label: t("support.customer"),
                value: (
                  <MaybeLink
                    href={
                      linkCustomer &&
                      ticket.user_id &&
                      `/customers/${ticket.user_id}`
                    }
                  >
                    {customer}
                  </MaybeLink>
                ),
              },
              {
                label: t("support.topic"),
                value: t(`support.topics.${ticket.topic}`),
              },
              {
                label: t("support.priority"),
                value: (
                  <StatusBadge tone={ticketPriorityTone[ticket.priority]}>
                    {t(`support.priorities.${ticket.priority}`)}
                  </StatusBadge>
                ),
              },
              {
                label: t("support.lastMessage"),
                value: format.dateTime(ticket.last_message_at),
              },
            ]}
          />
        ),
        row: rowOf("support", {
          assignee: ticket.assigned_to,
          assigneeName: ticket.assigned_to
            ? (teamNames.get(ticket.assigned_to) ?? t("support.unnamedStaff"))
            : null,
          detail: customer,
          href: `/support/${ticket.id}`,
          id: ticket.id,
          since: ticket.last_message_at,
          subtype: t("dashboard.inbox.types.ticket"),
          title: `${t("support.number", { number: String(ticket.number) })} · ${ticket.subject}`,
        }),
      };
    }),
    total: count ?? 0,
  };
};

// ── Verifications ──────────────────────────────────────────────────────────

const loadVerifications = async ({
  format,
  locale,
  role,
  supabase,
  t,
}: Context): Promise<KindResult> => {
  const [requests, organizations, cards, documents, universities] =
    await Promise.all([
      supabase
        .from("verification_requests")
        .select("id, user_id, kind, institution, files, created_at", exact)
        .eq("status", "pending")
        .or("kind.eq.identity,method.eq.documents")
        .order("created_at")
        .limit(PER_KIND),
      supabase
        .from("organization_verifications")
        .select(
          "organization_id, method, letter, is_student_society, university, approval, requested_at, organization:organizations (name)",
          exact
        )
        .eq("status", "pending")
        .order("requested_at")
        .limit(PER_KIND),
      supabase
        .from("student_requests")
        .select("id, user_id, university_id, card_path, created_at", exact)
        .eq("method", "card")
        .eq("status", "pending")
        .order("created_at")
        .limit(PER_KIND),
      supabase
        .from("student_verifications")
        .select(
          "id, email, university_id, document_kind, document_path, created_at, partner:pass_partners!inner (name)",
          exact
        )
        .eq("status", "pending")
        .order("created_at")
        .limit(PER_KIND),
      supabase.from("universities").select("id, name_ar, name_en"),
    ]);
  const pending = requests.data ?? [];
  const orgs = organizations.data ?? [];
  const cardRows = cards.data ?? [];
  const documentRows = documents.data ?? [];
  const universityName = (id: string | null) => {
    const row = (universities.data ?? []).find((item) => item.id === id);
    return row ? localized(row, "name", locale) : "";
  };

  const [names, requestFiles, orgFiles, cardFiles, documentFiles] =
    await Promise.all([
      profileNames(supabase, [
        ...pending.map((row) => row.user_id),
        ...cardRows.map((row) => row.user_id),
      ]),
      Promise.all(
        pending.map((row) =>
          signAll(row.files ?? [], (path) =>
            getVerificationFileUrl(supabase, path)
          )
        )
      ),
      Promise.all(
        orgs.map((row) =>
          signAll(
            [row.letter, row.approval].filter((path): path is string =>
              Boolean(path)
            ),
            (path) => getOrganizationFileUrl(supabase, path)
          )
        )
      ),
      Promise.all(
        cardRows.map((row) =>
          signAll(row.card_path ? [row.card_path] : [], (path) =>
            getStudentCardUrl(supabase, path)
          )
        )
      ),
      Promise.all(
        documentRows.map((row) =>
          signAll(row.document_path ? [row.document_path] : [], (path) =>
            getStudentDocumentUrl(supabase, path)
          )
        )
      ),
    ]);
  const labels = {
    imageAlt: t("customers.verifications.documentAlt"),
    missingLabel: t("customers.verifications.noFile"),
    openLabel: t("customers.verifications.openDocument"),
  };
  const write = canWrite(role, "customers");
  const yearEnd = academicYearEnd();
  const member = (userId: string) =>
    names.get(userId) ?? t("customers.verifications.unnamed");
  const facts = (list: { label: string; value: ReactNode }[]) => (
    <DetailList items={list} />
  );
  const reviewForm = (id: string, identity: boolean) =>
    identity ? (
      <ReviewIdentityForm id={id} />
    ) : (
      <ReviewEducatorForm id={id} yearEnd={yearEnd} />
    );

  const items: InboxItem[] = [
    ...pending.map((row, index) => {
      const identity = row.kind === "identity";
      return {
        actions: write ? reviewForm(row.id, identity) : null,
        facts: (
          <div className="grid gap-4">
            {facts([
              {
                label: t("dashboard.inbox.facts.member"),
                value: (
                  <MaybeLink href={`/customers/${row.user_id}`}>
                    {member(row.user_id)}
                  </MaybeLink>
                ),
              },
              ...(row.institution
                ? [
                    {
                      label: t("dashboard.inbox.facts.institution"),
                      value: row.institution,
                    },
                  ]
                : []),
              {
                label: t("dashboard.inbox.facts.sent"),
                value: format.dateTime(row.created_at),
              },
            ])}
            <SignedFiles files={requestFiles[index] ?? []} {...labels} />
          </div>
        ),
        row: rowOf("verifications", {
          detail: member(row.user_id),
          href: `/customers/verifications#${identity ? "identity" : "educators"}`,
          id: row.id,
          since: row.created_at,
          subtype: t(
            identity
              ? "dashboard.inbox.types.identity"
              : "dashboard.inbox.types.educator"
          ),
          title: member(row.user_id),
        }),
      };
    }),
    ...orgs.map((row, index) => {
      const name =
        one(row.organization)?.name ?? t("customers.verifications.unnamed");
      return {
        actions: write ? (
          <ReviewOrganizationForm id={row.organization_id} />
        ) : null,
        facts: (
          <div className="grid gap-4">
            {facts([
              {
                label: t("dashboard.inbox.facts.method"),
                value: t(
                  row.method === "domain"
                    ? "customers.verifications.byDomain"
                    : "customers.verifications.byLetter"
                ),
              },
              ...(row.is_student_society
                ? [
                    {
                      label: t("dashboard.inbox.facts.institution"),
                      value: t("customers.verifications.society", {
                        university: row.university ?? "",
                      }),
                    },
                  ]
                : []),
              {
                label: t("dashboard.inbox.facts.sent"),
                value: format.dateTime(row.requested_at),
              },
            ])}
            <SignedFiles files={orgFiles[index] ?? []} {...labels} />
          </div>
        ),
        row: rowOf("verifications", {
          detail: t(
            row.method === "domain"
              ? "customers.verifications.byDomain"
              : "customers.verifications.byLetter"
          ),
          href: "/customers/verifications#organizations",
          id: row.organization_id,
          since: row.requested_at,
          subtype: t("dashboard.inbox.types.organization"),
          title: name,
        }),
      };
    }),
    ...cardRows.map((row, index) => ({
      actions: write ? <ReviewCardForm id={row.id} yearEnd={yearEnd} /> : null,
      facts: (
        <div className="grid gap-4">
          {facts([
            {
              label: t("dashboard.inbox.facts.member"),
              value: (
                <MaybeLink href={`/customers/${row.user_id}`}>
                  {member(row.user_id)}
                </MaybeLink>
              ),
            },
            {
              label: t("dashboard.inbox.facts.institution"),
              value: universityName(row.university_id),
            },
            {
              label: t("dashboard.inbox.facts.sent"),
              value: format.dateTime(row.created_at),
            },
          ])}
          <SignedFiles files={cardFiles[index] ?? []} {...labels} />
        </div>
      ),
      row: rowOf("verifications", {
        detail: universityName(row.university_id),
        href: "/customers/students",
        id: row.id,
        since: row.created_at,
        subtype: t("dashboard.inbox.types.studentCard"),
        title: member(row.user_id),
      }),
    })),
    ...documentRows.map((row, index) => {
      const partner = one(row.partner)?.name ?? "";
      return {
        actions: write ? <ReviewDocumentForm id={row.id} /> : null,
        facts: (
          <div className="grid gap-4">
            {facts([
              {
                label: t("dashboard.inbox.facts.partner"),
                value: partner,
              },
              {
                label: t("dashboard.inbox.facts.email"),
                value: <span dir="ltr">{row.email}</span>,
              },
              {
                label: t("dashboard.inbox.facts.institution"),
                value: universityName(row.university_id),
              },
              {
                label: t("dashboard.inbox.facts.sent"),
                value: format.dateTime(row.created_at),
              },
            ])}
            <SignedFiles files={documentFiles[index] ?? []} {...labels} />
          </div>
        ),
        row: rowOf("verifications", {
          detail: partner,
          href: "/customers/students#documents",
          id: row.id,
          since: row.created_at,
          subtype: t("dashboard.inbox.types.studentDocument"),
          title: row.email ?? partner,
        }),
      };
    }),
  ];

  return {
    items,
    total:
      (requests.count ?? 0) +
      (organizations.count ?? 0) +
      (cards.count ?? 0) +
      (documents.count ?? 0),
  };
};

// ── Product checks ─────────────────────────────────────────────────────────

const loadChecks = async ({
  format,
  locale,
  role,
  supabase,
  t,
}: Context): Promise<KindResult> => {
  const [checks, flags] = await Promise.all([
    supabase
      .from("product_checks")
      .select(
        "id, reason, created_at, product:products!product_checks_product_id_fkey(id, name_ar, name_en, status, images), other:products!product_checks_other_product_id_fkey(id, name_ar, name_en)",
        exact
      )
      .is("resolved_at", null)
      .order("created_at")
      .limit(PER_KIND),
    supabase
      .from("product_flags")
      .select(
        "id, note, created_at, product:products(id, name_ar, name_en, status, images), seller:sellers(name)",
        exact
      )
      .is("resolved_at", null)
      .order("created_at")
      .limit(PER_KIND),
  ]);
  const write = canWrite(role, "catalog");
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const deleted = t("catalog.checks.deleted");
  const productName = (
    product: { name_ar: string; name_en: string } | null
  ): string => (product ? localized(product, "name", locale) : deleted);
  const productFacts = (
    product: {
      id: string;
      images: string[];
      name_ar: string;
      name_en: string;
      status: string;
    } | null,
    more: { label: string; value: ReactNode }[]
  ) => (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <ProductCover
          image={product?.images[0]}
          size={64}
          supabaseUrl={supabaseUrl}
        />
        <div className="grid gap-1">
          <MaybeLink href={product ? `/catalog/products/${product.id}` : null}>
            <span className="font-medium">{productName(product)}</span>
          </MaybeLink>
          {product && product.status !== "active" ? (
            <StatusBadge tone="neutral">
              {t("catalog.checks.notLive")}
            </StatusBadge>
          ) : null}
        </div>
      </div>
      <DetailList items={more} />
    </div>
  );

  const items: InboxItem[] = [
    ...(checks.data ?? []).map((check) => ({
      actions: write ? (
        <ActionButton
          action={resolveProductCheck}
          fields={{ id: check.id }}
          variant="default"
        >
          {t("catalog.checks.resolve")}
        </ActionButton>
      ) : null,
      facts: productFacts(check.product, [
        {
          label: t("catalog.checks.reason"),
          value: (
            <StatusBadge
              tone={check.reason === "banned" ? "danger" : "warning"}
            >
              {t(`catalog.checks.reasons.${check.reason}`)}
            </StatusBadge>
          ),
        },
        ...(check.other
          ? [
              {
                label: t("catalog.checks.duplicateOf"),
                value: (
                  <MaybeLink href={`/catalog/products/${check.other.id}`}>
                    {localized(check.other, "name", locale)}
                  </MaybeLink>
                ),
              },
            ]
          : []),
        {
          label: t("catalog.checks.date"),
          value: format.dateTime(check.created_at),
        },
      ]),
      row: rowOf("checks", {
        detail: t(`catalog.checks.reasons.${check.reason}`),
        href: check.product
          ? `/catalog/products/${check.product.id}`
          : "/catalog/checks",
        id: check.id,
        since: check.created_at,
        subtype: t("dashboard.inbox.types.check"),
        title: check.product
          ? localized(check.product, "name", locale)
          : deleted,
      }),
    })),
    ...(flags.data ?? []).map((flag) => ({
      actions: write ? (
        <ActionButton
          action={resolveProductFlag}
          fields={{ id: flag.id }}
          variant="default"
        >
          {t("catalog.checks.resolve")}
        </ActionButton>
      ) : null,
      facts: productFacts(flag.product, [
        { label: t("catalog.checks.shop"), value: flag.seller?.name ?? "" },
        {
          label: t("catalog.checks.note"),
          value: <p className="whitespace-pre-wrap">{flag.note}</p>,
        },
        {
          label: t("catalog.checks.date"),
          value: format.dateTime(flag.created_at),
        },
      ]),
      row: rowOf("checks", {
        detail: flag.seller?.name ?? "",
        href: flag.product
          ? `/catalog/products/${flag.product.id}`
          : "/catalog/checks#flags",
        id: flag.id,
        since: flag.created_at,
        subtype: t("dashboard.inbox.types.flag"),
        title: flag.product ? localized(flag.product, "name", locale) : deleted,
      }),
    })),
  ];

  return { items, total: (checks.count ?? 0) + (flags.count ?? 0) };
};

// ── Returns and disputes ───────────────────────────────────────────────────

const RETURN_COLUMNS =
  "id, number, status, reason, details, photos, quantity, unopened, fault, shop_note, condition_note, received_at, disputed_at, refund_due_at, refund_amount, refund_bulbs, user_id, created_at, item:order_items!inner (name_ar, name_en, seller_name, unit_price), order:orders!inner (id, number, payment_method)" as const;

const loadReturns = async ({
  locale,
  role,
  supabase,
  t,
}: Context): Promise<KindResult> => {
  const reasons = await getTranslations("app.orders.returns.reasons");
  const money = seesMoney(role);
  const [disputed, due] = await Promise.all([
    supabase
      .from("returns")
      .select(RETURN_COLUMNS, exact)
      .eq("status", "disputed")
      .order("disputed_at")
      .limit(PER_KIND),
    money
      ? supabase
          .from("returns")
          .select(RETURN_COLUMNS, exact)
          .eq("status", "refund_due")
          .order("refund_due_at")
          .limit(PER_KIND)
      : Promise.resolve({ count: 0, data: [] }),
  ]);
  const all = [...(disputed.data ?? []), ...(due.data ?? [])];
  const [names, photos] = await Promise.all([
    profileNames(
      supabase,
      all.map((item) => item.user_id)
    ),
    Promise.all(
      (disputed.data ?? []).map((item) =>
        signAll(item.photos, (path) => getReturnPhotoUrl(supabase, path))
      )
    ),
  ]);
  const write = canWrite(role, "orders");

  type Return = (typeof all)[number];
  const title = (item: Return) =>
    t("orders.returns.line", {
      name: localized(item.item, "name", locale),
      number: String(item.number),
      quantity: String(item.quantity),
      shop: item.item.seller_name ?? t("orders.returns.house"),
    });
  const common = (item: Return) => [
    {
      label: t("dashboard.inbox.facts.order"),
      value: (
        <MaybeLink href={`/orders/${item.order.id}`}>
          #{item.order.number}
        </MaybeLink>
      ),
    },
    {
      label: t("dashboard.inbox.facts.customer"),
      value: (
        <MaybeLink
          href={
            canRead(role, "customers") &&
            item.user_id &&
            `/customers/${item.user_id}`
          }
        >
          {(item.user_id && names.get(item.user_id)) ||
            t("support.unnamedCustomer")}
        </MaybeLink>
      ),
    },
    {
      label: t("dashboard.inbox.facts.reason"),
      value: `${reasons(item.reason)}${item.unopened ? ` · ${t("orders.returns.unopened")}` : ""}`,
    },
    {
      label: t("dashboard.inbox.facts.value"),
      value: formatPrice(item.item.unit_price * item.quantity, locale),
    },
  ];

  const items: InboxItem[] = [
    ...(disputed.data ?? []).map((item, index) => ({
      actions: write ? (
        <DecideReturnForm fault={item.fault} id={item.id} />
      ) : null,
      facts: (
        <div className="grid gap-4">
          <DetailList
            items={[
              ...common(item),
              ...(item.details
                ? [
                    {
                      label: t("dashboard.inbox.facts.customerSays"),
                      value: item.details,
                    },
                  ]
                : []),
              {
                label: t("dashboard.inbox.facts.shopSays"),
                value: item.received_at
                  ? (item.condition_note ?? "")
                  : (item.shop_note ?? ""),
              },
            ]}
          />
          {item.photos.length > 0 ? (
            <SignedFiles
              files={photos[index] ?? []}
              imageAlt={t("dashboard.inbox.facts.photo")}
              missingLabel={t("customers.verifications.noFile")}
              openLabel={t("customers.verifications.openDocument")}
            />
          ) : null}
        </div>
      ),
      row: rowOf("returns", {
        detail: reasons(item.reason),
        href: "/orders/returns",
        id: item.id,
        since: item.disputed_at ?? item.created_at,
        subtype: t("dashboard.inbox.types.disputed"),
        title: title(item),
      }),
    })),
    ...(due.data ?? []).map((item) => ({
      actions: write ? <RefundedForm id={item.id} /> : null,
      facts: (
        <DetailList
          items={[
            ...common(item),
            {
              label: t("dashboard.inbox.facts.refund"),
              value: t("orders.returns.refund", {
                amount: formatPrice(item.refund_amount ?? 0, locale),
                bulbs: String(item.refund_bulbs ?? 0),
              }),
            },
            {
              label: t("dashboard.inbox.facts.how"),
              value: t(
                item.order.payment_method === "online"
                  ? "orders.returns.viaWayl"
                  : "orders.returns.viaTransfer"
              ),
            },
          ]}
        />
      ),
      row: rowOf("returns", {
        detail: formatPrice(item.refund_amount ?? 0, locale),
        href: "/orders/returns#refunds",
        id: item.id,
        since: item.refund_due_at ?? item.created_at,
        subtype: t("dashboard.inbox.types.refund"),
        title: title(item),
      }),
    })),
  ];

  return {
    items,
    total: (disputed.count ?? 0) + (due.count ?? 0),
  };
};

// ── Shops to approve ───────────────────────────────────────────────────────

const loadShops = async ({
  format,
  role,
  supabase,
  t,
}: Context): Promise<KindResult> => {
  const { count, data } = await supabase
    .from("sellers")
    .select(
      "id, name, kind, applied_at, created_at, organization:organizations (name), details:seller_details (documents, payout_bank, payout_account_name, payout_iban, deposit_required, review_note)",
      exact
    )
    .eq("is_house", false)
    .eq("status", "pending")
    .order("applied_at", { nullsFirst: false })
    .limit(PER_KIND);
  const shops = data ?? [];
  const documents = await Promise.all(
    shops.map((shop) =>
      signAll(one(shop.details)?.documents ?? [], (path) =>
        getOrganizationFileUrl(supabase, path)
      )
    )
  );
  const write = canWrite(role, "companies");

  return {
    items: shops.map((shop, index) => {
      const details = one(shop.details);
      const organization = one(shop.organization)?.name ?? "";
      return {
        actions: write ? (
          <div className="grid gap-4">
            <ShopKindForm id={shop.id} kind={shop.kind} />
            <DecideSellerForm
              deposit={details?.deposit_required ?? 0}
              id={shop.id}
              note={details?.review_note ?? ""}
            />
          </div>
        ) : null,
        facts: (
          <DetailList
            items={[
              {
                label: t("dashboard.inbox.facts.organization"),
                value: organization,
              },
              ...(shop.kind
                ? [
                    {
                      label: t("dashboard.inbox.facts.kind"),
                      value: t(`companies.shops.kinds.${shop.kind}`),
                    },
                  ]
                : []),
              {
                label: t("companies.shops.documents"),
                value:
                  (documents[index] ?? []).length === 0 ? (
                    t("companies.shops.noDocuments")
                  ) : (
                    <ul className="grid gap-1">
                      {(documents[index] ?? []).map((file) => (
                        <li key={file.path}>
                          {file.url ? (
                            <a
                              className="underline"
                              dir="auto"
                              href={file.url}
                              rel="noopener"
                              target="_blank"
                            >
                              {fileNameOf(file.path)}
                            </a>
                          ) : (
                            <span dir="auto">{fileNameOf(file.path)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ),
              },
              {
                label: t("companies.shops.payout"),
                value: details?.payout_iban ? (
                  <span>
                    {details.payout_bank} · {details.payout_account_name}
                    <span className="block tabular-nums" dir="ltr">
                      {details.payout_iban}
                    </span>
                  </span>
                ) : (
                  t("companies.shops.noPayout")
                ),
              },
              {
                label: t("dashboard.inbox.facts.sent"),
                value: format.dateTime(shop.applied_at ?? shop.created_at),
              },
            ]}
          />
        ),
        row: rowOf("shops", {
          detail: organization,
          href: "/partners/shops",
          id: shop.id,
          since: shop.applied_at ?? shop.created_at,
          subtype: t("dashboard.inbox.types.shop"),
          title: shop.name,
        }),
      };
    }),
    total: count ?? 0,
  };
};

// ── Program applications ───────────────────────────────────────────────────

const loadApplications = async ({
  format,
  locale,
  role,
  supabase,
  t,
}: Context): Promise<KindResult> => {
  const { count, data } = await supabase
    .from("program_applications")
    .select("id, program_id, user_id, price, created_at", exact)
    .eq("status", "submitted")
    .or("guardian_status.is.null,guardian_status.eq.approved")
    .order("created_at")
    .limit(PER_KIND);
  const applications = data ?? [];
  const [names, { data: programs }] = await Promise.all([
    profileNames(
      supabase,
      applications.map((row) => row.user_id)
    ),
    supabase
      .from("opportunities")
      .select("id, title_ar, title_en")
      .in("id", [...new Set(applications.map((row) => row.program_id))]),
  ]);
  const programName = (id: string) => {
    const program = (programs ?? []).find((row) => row.id === id);
    return program ? localized(program, "title", locale) : "";
  };
  const write = canWrite(role, "editorial");

  return {
    items: applications.map((row) => {
      const applicant =
        names.get(row.user_id) ?? t("editorial.programs.unnamed");
      return {
        actions: write ? <ReviewApplicationForm id={row.id} /> : null,
        facts: (
          <DetailList
            items={[
              {
                label: t("dashboard.inbox.facts.program"),
                value: (
                  <MaybeLink href={`/club/opportunities/${row.program_id}`}>
                    {programName(row.program_id)}
                  </MaybeLink>
                ),
              },
              {
                label: t("editorial.programs.applicant"),
                value: (
                  <MaybeLink
                    href={
                      canRead(role, "customers") && `/customers/${row.user_id}`
                    }
                  >
                    {applicant}
                  </MaybeLink>
                ),
              },
              {
                label: t("dashboard.inbox.facts.price"),
                value: format.money(row.price),
              },
              {
                label: t("editorial.programs.applied"),
                value: format.dateTime(row.created_at),
              },
            ]}
          />
        ),
        row: rowOf("applications", {
          detail: programName(row.program_id),
          href: `/club/opportunities/${row.program_id}/applications/${row.id}`,
          id: row.id,
          since: row.created_at,
          subtype: t("dashboard.inbox.types.application"),
          title: applicant,
        }),
      };
    }),
    total: count ?? 0,
  };
};

// ── Submissions ────────────────────────────────────────────────────────────

const loadSubmissions = async ({
  format,
  role,
  supabase,
  t,
  tStore,
}: Context): Promise<KindResult> => {
  const [{ data }, { data: staffRows }] = await Promise.all([
    supabase.rpc("review_queue"),
    supabase
      .from("staff")
      .select("user_id")
      .in("role", ["editor", "admin", "superadmin"]),
  ]);
  const waiting = (data ?? [])
    .filter((row) => row.status === "pending" || row.status === "under_review")
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
  const editorNames = await profileNames(
    supabase,
    (staffRows ?? []).map((row) => row.user_id)
  );
  const editors = [...editorNames.entries()].map(([id, name]) => ({
    id,
    name: name ?? t("editorial.review.unnamedEditor"),
  }));
  const write = canWrite(role, "editorial");

  return {
    items: waiting.slice(0, PER_KIND).map((row) => ({
      actions: write ? (
        <div className="grid gap-6">
          <AssignForm
            assignee={row.assigned_to}
            editors={editors}
            id={row.id}
          />
          <DecisionForm decisionNote={null} id={row.id} status={row.status} />
        </div>
      ) : null,
      facts: (
        <DetailList
          items={[
            {
              label: t("dashboard.inbox.facts.kind"),
              value: tStore(`submissionType.${row.type}`),
            },
            {
              label: t("dashboard.inbox.facts.status"),
              value: (
                <StatusBadge status={row.status}>
                  {tStore(`submissionStatus.${row.status}`)}
                </StatusBadge>
              ),
            },
            {
              label: t("editorial.review.submitted"),
              value: format.dateTime(row.submitted_at),
            },
          ]}
        />
      ),
      row: rowOf("submissions", {
        assignee: row.assigned_to,
        assigneeName: row.assigned_to
          ? (editorNames.get(row.assigned_to) ??
            t("editorial.review.unnamedEditor"))
          : null,
        detail: tStore(`submissionType.${row.type}`),
        href: `/club/submissions/${row.id}`,
        id: row.id,
        since: row.submitted_at,
        subtype: t("dashboard.inbox.types.submission"),
        title: row.title,
      }),
    })),
    total: waiting.length,
  };
};

const loaders: Record<InboxKind, (context: Context) => Promise<KindResult>> = {
  applications: loadApplications,
  checks: loadChecks,
  returns: loadReturns,
  shops: loadShops,
  submissions: loadSubmissions,
  support: loadSupport,
  verifications: loadVerifications,
};

/**
 * The Inbox's decisions for the role: for each of `kinds` it can open,
 * the oldest items with their drawer, and how many wait in all. Every
 * query runs as the staff member, so RLS decides what comes back.
 */
export const loadInboxItems = async (
  supabase: ServerClient,
  role: StaffRole,
  locale: Locale,
  only: readonly InboxKind[],
  /** "Mine": only items assigned to this user, where the query can say. */
  mine: string | null = null
): Promise<Partial<Record<InboxKind, KindResult>>> => {
  const [t, tStore] = await Promise.all([
    getTranslations("admin"),
    getTranslations("store"),
  ]);
  const context: Context = {
    format: formatters(locale),
    locale,
    mine,
    role,
    supabase,
    t,
    tStore,
  };
  const kinds = visibleKinds(role).filter((kind) => only.includes(kind));
  const results = await Promise.all(
    kinds.map((kind) => loaders[kind](context))
  );
  return Object.fromEntries(kinds.map((kind, index) => [kind, results[index]]));
};
