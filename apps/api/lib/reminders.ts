import type { Database } from "@repo/database";
import {
  type ReminderItem,
  type ReminderKind,
  type ReminderLocale,
  ReminderTemplate,
  reminderSubject,
} from "@repo/email/templates/reminder";
import { localePath } from "@repo/internationalization";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReactElement } from "react";

/**
 * Review requests (3 days after delivery) and cart reminders (a cart left
 * 24 hours, Passes that allow marketing): the database hands each out once
 * and adds the notification (`take_review_requests`, `take_cart_reminders`,
 * migration `20270319000000_reminders.sql`); this sends the email.
 */

interface Product {
  name_ar: string;
  name_en: string;
  quantity?: number;
  slug: string;
}

export interface ReminderDeps {
  admin: SupabaseClient<Database>;
  logger: { error: (message: string) => void };
  send: (email: {
    react: ReactElement;
    subject: string;
    to: string;
  }) => Promise<unknown>;
  /** The website, for the links. */
  webUrl: string;
}

const BATCH = 50;

const asLocale = (value: string | null): ReminderLocale =>
  value === "en" ? "en" : "ar";

/** A link on the website in the member's language. */
const webLink = (webUrl: string, locale: ReminderLocale, path: string) =>
  new URL(localePath(locale, path), webUrl).toString();

/** The email's items: each product's review form, or its page. */
export const reminderItems = (
  products: readonly Product[],
  kind: ReminderKind,
  locale: ReminderLocale,
  webUrl: string
): ReminderItem[] =>
  products.slice(0, 5).map((product) => ({
    href: webLink(
      webUrl,
      locale,
      `/store/${product.slug}${kind === "review" ? "#reviews" : ""}`
    ),
    name: locale === "ar" ? product.name_ar : product.name_en,
    quantity: product.quantity,
  }));

const sendOne = async (
  deps: ReminderDeps,
  kind: ReminderKind,
  row: { email: string | null; items: unknown; locale: string | null }
) => {
  const products = (row.items ?? []) as Product[];
  if (!row.email || products.length === 0) {
    return false;
  }
  const locale = asLocale(row.locale);
  const items = reminderItems(products, kind, locale, deps.webUrl);
  await deps.send({
    react: ReminderTemplate({
      action:
        kind === "review"
          ? (items[0]?.href ?? webLink(deps.webUrl, locale, "/pass/orders"))
          : webLink(deps.webUrl, locale, "/cart"),
      items,
      kind,
      locale,
      settings:
        kind === "cart"
          ? webLink(deps.webUrl, locale, "/pass/settings#phone")
          : undefined,
    }),
    subject: reminderSubject(kind, locale),
    to: row.email,
  });
  return true;
};

/** Sends what's due; one failed email never stops the others. */
export const sendReminders = async (deps: ReminderDeps) => {
  const [reviews, carts] = await Promise.all([
    deps.admin.rpc("take_review_requests", { batch: BATCH }),
    deps.admin.rpc("take_cart_reminders", { batch: BATCH }),
  ]);
  if (reviews.error) {
    throw new Error(reviews.error.message);
  }
  if (carts.error) {
    throw new Error(carts.error.message);
  }

  const run = async (
    kind: ReminderKind,
    rows: { email: string | null; items: unknown; locale: string | null }[]
  ) => {
    const results = await Promise.allSettled(
      rows.map((row) => sendOne(deps, kind, row))
    );
    for (const result of results) {
      if (result.status === "rejected") {
        deps.logger.error(
          `Reminder email (${kind}) failed: ${String(result.reason)}`
        );
      }
    }
    return results.filter(
      (result) => result.status === "fulfilled" && result.value
    ).length;
  };

  return {
    carts: await run("cart", carts.data ?? []),
    reviews: await run("review", reviews.data ?? []),
  };
};
