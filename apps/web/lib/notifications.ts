"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice } from "@repo/commerce";
import type { Enums, Json } from "@repo/database";
import type { Locale } from "@repo/internationalization";
import {
  businessPath,
  currentAppPath,
  safeNextPath,
} from "@repo/internationalization/app-paths";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appLink } from "./links";
import { queryKeys, requireUserId, unwrap } from "./queries";

/**
 * In-app notifications, written by database triggers. Each row carries an
 * `event` key and its `data`; the text comes from the viewer's translations
 * (`store.notifications`), so a notification reads in their language.
 */

export type NotificationKind = Enums<"notification_kind">;

/**
 * Every event the triggers emit (see the customer_features, whatsapp and
 * bulbs migrations, and the later ones).
 */
export const NOTIFICATION_EVENTS = [
  "order_paid",
  "order_processing",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
  "order_refunded",
  "rental_active",
  "rental_overdue",
  "rental_returned",
  "rental_cancelled",
  "rental_due_soon",
  "support_reply",
  "bulbs_expiring",
  "bulbs_birthday",
  "quote_sent",
  "invoice_issued",
  "plus_seat_active",
  "pass_app_approved",
  "pass_app_declined",
  "guardian_order_request",
  "gift_claimed",
  "gift_shipped",
  "gift_delivered",
  "guardian_approved",
  "guardian_declined",
  "guardian_linked",
  "plus_invite",
  "plus_swap_booked",
  "plus_swap_done",
  "student_verified",
  "student_rejected",
  "survey_approved",
  "survey_rejected",
  "survey_paused",
  "survey_appeal_upheld",
  "survey_appeal_declined",
  "survey_refunded",
  "survey_answers_expiring",
  "survey_answers_deleted",
  "product_available",
  "saved_back_in_stock",
  "saved_out_now",
  "saved_price_drop",
  "offer_accepted",
  "offer_declined",
  "offer_countered",
  "return_approved",
  "return_rejected",
  "return_refund_due",
  "return_refunded",
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const isKnownEvent = (event: string): event is NotificationEvent =>
  NOTIFICATION_EVENTS.includes(event as NotificationEvent);

export interface NotificationRow {
  created_at: string;
  data: Json;
  event: string;
  id: string;
  kind: NotificationKind;
  link: string | null;
  read_at: string | null;
}

/** Message keys under `store.notifications`, with their values. */
export interface NotificationText {
  body: `events.${NotificationEvent}.body` | "fallbackBody";
  title: `events.${NotificationEvent}.title` | `kinds.${NotificationKind}`;
  values: Record<string, string>;
}

const asRecord = (data: Json): Record<string, Json | undefined> =>
  data && typeof data === "object" && !Array.isArray(data) ? data : {};

const text = (value: Json | undefined) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

/** The Bulbs (and, for `bulbs_expiring`, the expiry date) of a Bulbs notice. */
const bulbsExpiringValues = (
  data: Record<string, Json | undefined>,
  locale: Locale
) => {
  const bulbs = Number(text(data.bulbs));
  const expires = text(data.expires_at);
  return {
    bulbs: Number.isFinite(bulbs) ? formatNumber(bulbs, locale) : "",
    date: expires ? formatDate(expires, locale) : "",
  };
};

/** A quote's number, request title and total (`quote_sent`). */
const quoteValues = (
  data: Record<string, Json | undefined>,
  locale: Locale
) => {
  const total = Number(text(data.total));
  return {
    number: text(data.number),
    title: text(data.title),
    total: Number.isFinite(total) ? formatPrice(total, locale) : "",
  };
};

/** An invoice's number, amount and due date (`invoice_issued`). */
const invoiceValues = (
  data: Record<string, Json | undefined>,
  locale: Locale
) => {
  const amount = Number(text(data.amount));
  const due = text(data.due_on);
  return {
    amount: Number.isFinite(amount) ? formatPrice(amount, locale) : "",
    date: due ? formatDate(due, locale) : "",
    number: text(data.number),
  };
};

/** The item's name in the viewer's language, falling back to the other. */
const itemName = (data: Record<string, Json | undefined>, locale: Locale) => {
  const english = text(data.name_en);
  const arabic = text(data.name_ar);
  return (locale === "ar" ? arabic : english) || english || arabic;
};

/** An offer's item and amount (`offer_*`). */
const offerValues = (
  data: Record<string, Json | undefined>,
  locale: Locale
) => {
  const amount = Number(text(data.amount));
  return {
    amount: Number.isFinite(amount) ? formatPrice(amount, locale) : "",
    name: itemName(data, locale),
  };
};

/** A return's number, item, order and refund (`return_*`). */
const returnValues = (
  data: Record<string, Json | undefined>,
  locale: Locale
) => ({
  ...offerValues(data, locale),
  number: text(data.number),
  order: text(data.order_number),
});

/** Events whose data needs formatting beyond the common fields. */
const extraValues: Partial<
  Record<
    NotificationEvent,
    (
      data: Record<string, Json | undefined>,
      locale: Locale
    ) => Record<string, string>
  >
> = {
  bulbs_birthday: bulbsExpiringValues,
  bulbs_expiring: bulbsExpiringValues,
  gift_claimed: (data) => ({
    name: text(data.name),
    number: text(data.number),
  }),
  gift_delivered: (data) => ({ number: text(data.number) }),
  gift_shipped: (data) => ({ number: text(data.number) }),
  guardian_approved: (data) => ({ number: text(data.number) }),
  guardian_declined: (data) => ({ number: text(data.number) }),
  guardian_linked: (data) => ({ name: text(data.name) }),
  guardian_order_request: (data) => ({
    name: text(data.name),
    number: text(data.number),
  }),
  invoice_issued: invoiceValues,
  offer_accepted: offerValues,
  offer_countered: offerValues,
  offer_declined: offerValues,
  pass_app_approved: (data) => ({ name: text(data.name) }),
  pass_app_declined: (data) => ({ name: text(data.name) }),
  plus_invite: (data) => ({ hours: text(data.hours) }),
  plus_seat_active: (data) => ({ plan: text(data.plan) }),
  product_available: (data, locale) => ({ name: itemName(data, locale) }),
  quote_sent: quoteValues,
  return_approved: returnValues,
  return_refund_due: returnValues,
  return_refunded: returnValues,
  return_rejected: returnValues,
  saved_back_in_stock: (data, locale) => ({ name: itemName(data, locale) }),
  saved_out_now: (data, locale) => ({ name: itemName(data, locale) }),
  saved_price_drop: (data, locale) => {
    const price = Number(text(data.price));
    return {
      name: itemName(data, locale),
      price: Number.isFinite(price) ? formatPrice(price, locale) : "",
    };
  },
  student_verified: (data, locale) => {
    const until = text(data.until);
    return { date: until ? formatDate(`${until}T12:00:00`, locale) : "" };
  },
  survey_answers_deleted: (data) => ({ title: text(data.title) }),
  survey_answers_expiring: (data, locale) => ({
    date: text(data.date) ? formatDate(text(data.date), locale) : "",
    title: text(data.title),
  }),
  survey_appeal_declined: (data) => ({ title: text(data.title) }),
  survey_appeal_upheld: (data) => ({ title: text(data.title) }),
  survey_approved: (data) => ({ title: text(data.title) }),
  survey_paused: (data, locale) => {
    const reward = Number(text(data.reward));
    return {
      bulbs: Number.isFinite(reward) ? formatNumber(reward, locale) : "",
      title: text(data.title),
    };
  },
  survey_refunded: (data, locale) => {
    const amount = Number(text(data.amount));
    return {
      amount: Number.isFinite(amount) ? formatPrice(amount, locale) : "",
      title: text(data.title),
    };
  },
  survey_rejected: (data) => ({ title: text(data.title) }),
};

/**
 * Which messages render a notification, with its data formatted for them
 * (numbers as text, dates in Baghdad time). Unknown events fall back to a
 * title for their kind and a generic line.
 */
export const describeNotification = (
  notification: Pick<NotificationRow, "data" | "event" | "kind">,
  locale: Locale
): NotificationText => {
  const data = asRecord(notification.data);
  const { event } = notification;

  if (!isKnownEvent(event)) {
    return {
      body: "fallbackBody",
      title: `kinds.${notification.kind}`,
      values: {},
    };
  }

  const values: Record<string, string> = {};
  if (event.startsWith("order_") || event === "support_reply") {
    values.number = text(data.number);
  }
  if (event === "order_shipped") {
    values.tracking = text(data.tracking);
    values.hasTracking = values.tracking ? "yes" : "no";
  }
  if (event === "support_reply") {
    values.subject = text(data.subject);
  }
  Object.assign(values, extraValues[event]?.(data, locale));
  if (event.startsWith("rental_")) {
    const english = text(data.name_en);
    const arabic = text(data.name_ar);
    values.name = (locale === "en" ? english : arabic) || english || arabic;
    const due = text(data.due_at);
    values.due = due ? formatDate(due, locale) : "";
    values.hasDue = values.due ? "yes" : "no";
  }

  return {
    body: `events.${event}.body` as const,
    title: `events.${event}.title` as const,
    values,
  };
};

/**
 * The path to open, or null for a missing or unsafe link. Links under
 * `/business…` are Partners' pages, on its own site (where they
 * sit at the root: `/business/invoices` opens `/invoices` there).
 */
export const notificationHref = (
  link: string | null,
  locale: Locale = "en",
  appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
) => {
  const path = safeNextPath(link);
  if (!path) {
    return null;
  }
  const business = businessPath(path);
  return business ? appLink(appUrl, locale, business) : currentAppPath(path);
};

const NOTIFICATION_COLUMNS =
  "id, kind, event, data, link, read_at, created_at" as const;
const POLL_MS = 60_000;

export const useNotifications = (enabled = true) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user) && enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("notifications")
          .select(NOTIFICATION_COLUMNS)
          .eq("user_id", requireUserId(user?.id))
          .order("created_at", { ascending: false })
          .limit(20)
      ) as NotificationRow[],
    queryKey: queryKeys.notifications(user?.id ?? ""),
    refetchOnWindowFocus: true,
  });
};

/** Unread notifications, counted by the database; polled every minute. */
export const useUnreadCount = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", requireUserId(user?.id))
        .is("read_at", null);
      if (error) {
        throw error;
      }
      return count ?? 0;
    },
    queryKey: queryKeys.unreadNotifications(user?.id ?? ""),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
};

/** mark_notifications_read(): some notifications, or all without ids. */
export const useMarkNotificationsRead = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids?: string[]) =>
      unwrap(
        await supabase.rpc(
          "mark_notifications_read",
          ids ? { notification_ids: ids } : {}
        )
      ),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(user?.id ?? ""),
      }),
  });
};
