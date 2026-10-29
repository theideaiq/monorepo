"use client";

import { passOrigin } from "@repo/auth/pass";
import { useAuth } from "@repo/auth/provider";
import { formatPrice } from "@repo/commerce";
import type { Enums, Json } from "@repo/database";
import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import {
  businessPath,
  currentAppPath,
  safeNextPath,
} from "@repo/internationalization/app-paths";
import {
  formatDate,
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  "organization_verified",
  "organization_rejected",
  "opportunity_approved",
  "opportunity_changes",
  "opportunity_rejected",
  "auction_outbid",
  "auction_won",
  "auction_unpaid",
  "auction_second_chance",
  "auction_sold",
  "auction_unsold",
  "auction_unpaid_shop",
  "auction_mark_wrong",
  "sell_offer_received",
  "sell_offer_accepted",
  "sell_offer_completed",
  "sell_offer_cancelled",
  "sell_offer_cancelled_shop",
  "sell_message",
  "sell_message_shop",
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

/** The Bulbs and the expiry date of a `bulbs_expiring` reminder. */
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

/** An opportunity's title in the viewer's language. */
const localizedTitle = (
  data: Record<string, Json | undefined>,
  locale: Locale
) => text(locale === "ar" ? data.title_ar : data.title_en);

/** An auction's item in the viewer's language. */
const auctionItemName = (
  data: Record<string, Json | undefined>,
  locale: Locale
) => {
  const english = text(data.name_en);
  const arabic = text(data.name_ar);
  return (locale === "ar" ? arabic : english) || english || arabic;
};

/** A request's item, the offer's amount and the shop (`sell_*`). */
const sellValues = (data: Record<string, Json | undefined>, locale: Locale) => {
  const amount = Number(text(data.amount));
  return {
    amount: Number.isFinite(amount) ? formatPrice(amount, locale) : "",
    shop: text(data.shop),
    title: text(data.title),
  };
};

/** An auction's item, its price and when it must be paid (`auction_*`). */
const auctionValues = (
  data: Record<string, Json | undefined>,
  locale: Locale
) => {
  const amount = Number(text(data.amount));
  const payBy = text(data.pay_by);
  return {
    amount: Number.isFinite(amount) ? formatPrice(amount, locale) : "",
    name: auctionItemName(data, locale),
    time: payBy ? formatDateTime(payBy, locale) : "",
  };
};

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
  auction_mark_wrong: auctionValues,
  auction_outbid: auctionValues,
  auction_second_chance: auctionValues,
  auction_sold: auctionValues,
  auction_unpaid: auctionValues,
  auction_unpaid_shop: auctionValues,
  auction_unsold: auctionValues,
  auction_won: auctionValues,
  bulbs_birthday: bulbsExpiringValues,
  bulbs_expiring: bulbsExpiringValues,
  invoice_issued: invoiceValues,
  opportunity_approved: (data, locale) => ({
    title: localizedTitle(data, locale),
  }),
  opportunity_changes: (data, locale) => ({
    title: localizedTitle(data, locale),
  }),
  opportunity_rejected: (data, locale) => ({
    title: localizedTitle(data, locale),
  }),
  pass_app_approved: (data) => ({ name: text(data.name) }),
  pass_app_declined: (data) => ({ name: text(data.name) }),
  plus_seat_active: (data) => ({ plan: text(data.plan) }),
  quote_sent: quoteValues,
  sell_message: sellValues,
  sell_message_shop: sellValues,
  sell_offer_accepted: sellValues,
  sell_offer_cancelled: sellValues,
  sell_offer_cancelled_shop: sellValues,
  sell_offer_completed: sellValues,
  sell_offer_received: sellValues,
};

/**
 * Which messages render a notification, with its data formatted for them
 * (numbers as text, dates in Baghdad time). Unknown events fall back to a
 * title for their kind and a generic line.
 */
/**
 * The event to describe: an unpaid auction reaches the winner and the
 * shop under one name; the shop's links to Partners.
 */
/** Events that reach the member and the shop under one name. */
const SHOP_VARIANTS: Record<string, string> = {
  auction_unpaid: "auction_unpaid_shop",
  sell_message: "sell_message_shop",
  sell_offer_cancelled: "sell_offer_cancelled_shop",
};

const eventFor = ({
  event,
  link,
}: Pick<NotificationRow, "event"> & { link?: string | null }) =>
  (link?.startsWith("/selling") ? SHOP_VARIANTS[event] : undefined) ?? event;

export const describeNotification = (
  notification: Pick<NotificationRow, "data" | "event" | "kind"> & {
    link?: string | null;
  },
  locale: Locale
): NotificationText => {
  const data = asRecord(notification.data);
  const event = eventFor(notification);

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
 * Where a notification opens, or null for a missing or unsafe link: a page
 * of this site for links under `/business…` (`/business/invoices` →
 * `/invoices`), else the page on the website (an absolute URL).
 */
export const notificationHref = (link: string | null, locale = "en") => {
  const path = safeNextPath(link);
  if (!path) {
    return null;
  }
  return (
    businessPath(path) ??
    new URL(localePath(locale, currentAppPath(path)), passOrigin()).href
  );
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
