import { formatPrice, hasPriceRange, localized } from "@repo/commerce";
import { productImageUrl } from "@repo/commerce/catalog";
import type { Database } from "@repo/database";
import { type ChatPost, type DroidBot, postToChat, t } from "@repo/droid";
import { localePath } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { log } from "@repo/observability/log";
import { publicFileUrl } from "@repo/storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";

type Admin = SupabaseClient<Database>;
type Kind = Database["public"]["Enums"]["telegram_post_kind"];
type Locale = "ar" | "en";

/** At most this many products are listed in one "new arrivals" post. */
const ARRIVALS_LISTED = 8;

const siteUrl = (locale: Locale, path: string) =>
  new URL(localePath(locale, path), env.NEXT_PUBLIC_WEB_URL).toString();

/** Telegram fetches photos itself, so only public https URLs. */
const httpsOnly = (url: string | null) =>
  url?.startsWith("https://") ? url : null;

const editorialUrl = (path: string | null) =>
  path
    ? httpsOnly(
        path.startsWith("https://")
          ? path
          : publicFileUrl(env.NEXT_PUBLIC_SUPABASE_URL ?? "", "editorial", path)
      )
    : null;

const catalogUrl = (path: string | undefined) =>
  path
    ? httpsOnly(productImageUrl(env.NEXT_PUBLIC_SUPABASE_URL ?? "", path))
    : null;

interface Sources {
  events: Database["public"]["Tables"]["events"]["Row"][];
  posts: Database["public"]["Tables"]["posts"]["Row"][];
  products: (Database["public"]["Tables"]["products"]["Row"] & {
    /** Its variants' prices, for a "from" price; missing reads as one price. */
    product_variants?: { active: boolean; price: number }[];
  })[];
}

const loadSources = async (
  admin: Admin,
  ids: Record<Kind, string[]>
): Promise<Sources> => {
  const none = Promise.resolve({ data: [] });
  const [posts, events, products] = await Promise.all([
    ids.news.length > 0
      ? admin.from("posts").select("*").in("id", ids.news)
      : none,
    ids.events.length > 0
      ? admin
          .from("events")
          .select("*")
          .in("id", ids.events)
          .eq("published", true)
      : none,
    ids.arrivals.length > 0
      ? admin
          .from("products")
          .select("*, product_variants (active, price)")
          .in("id", ids.arrivals)
          .eq("status", "active")
      : none,
  ]);
  return {
    events: events.data ?? [],
    posts: posts.data ?? [],
    products: products.data ?? [],
  };
};

/** The posts for each kind, written in one language. */
export const buildPosts = (
  sources: Sources,
  locale: Locale
): Record<Kind, ChatPost[]> => {
  const news = sources.posts.map((post) => ({
    buttonLabel: t(locale, "postNewsOpen"),
    lines: [localized(post, "excerpt", locale)].filter(Boolean),
    photo: editorialUrl(post.cover_image),
    title: localized(post, "title", locale),
    url: siteUrl(locale, `/club/read/${post.slug}`),
  }));
  const events = sources.events.map((event) => ({
    buttonLabel: t(locale, "postEventOpen"),
    lines: [`${formatDateTime(event.starts_at, locale)} · ${event.location}`],
    photo: editorialUrl(event.cover_image),
    title: localized(event, "title", locale),
    url: siteUrl(locale, `/club/events/${event.slug}`),
  }));

  const { products } = sources;
  // "From …" when the versions cost different amounts.
  const price = (product: Sources["products"][number]) =>
    hasPriceRange(product.product_variants)
      ? t(locale, "priceFrom", { price: formatPrice(product.price, locale) })
      : formatPrice(product.price, locale);
  let arrivals: ChatPost[] = [];
  const [only] = products;
  if (products.length === 1 && only) {
    arrivals = [
      {
        buttonLabel: t(locale, "postProductOpen"),
        lines: [price(only)],
        photo: catalogUrl(only.images[0]),
        title: `${t(locale, "postArrivals")}: ${localized(only, "name", locale)}`,
        url: siteUrl(locale, `/store/${only.slug}`),
      },
    ];
  } else if (products.length > 1) {
    const listed = products.slice(0, ARRIVALS_LISTED);
    const more = products.length - listed.length;
    arrivals = [
      {
        buttonLabel: t(locale, "postArrivalsOpen"),
        lines: [
          ...listed.map(
            (product) =>
              `• ${localized(product, "name", locale)} — ${price(product)}`
          ),
          ...(more > 0 ? [t(locale, "postArrivalsMore", { count: more })] : []),
        ],
        photo: catalogUrl(listed[0]?.images[0]),
        title: t(locale, "postArrivals"),
        url: siteUrl(locale, "/store?sort=newest"),
      },
    ];
  }
  return { arrivals, events, news };
};

const topicColumn = {
  arrivals: "arrivals_topic",
  events: "events_topic",
  news: "news_topic",
} as const;

export interface TopicPostSummary {
  failed: number;
  sent: number;
}

/**
 * Sends what's queued in `telegram_posts` (news, events, new arrivals) to
 * every chat with a topic for it, in the chat's language.
 * `claim_telegram_posts` marks rows sent as it returns them, so the webhook
 * and the daily catch-up never post twice; a failed send is logged.
 */
export const deliverTelegramPosts = async (
  admin: Admin,
  bot: DroidBot
): Promise<TopicPostSummary> => {
  const { data: claimed, error } = await admin.rpc("claim_telegram_posts");
  if (error) {
    throw new Error(error.message);
  }
  const summary: TopicPostSummary = { failed: 0, sent: 0 };
  if (!claimed?.length) {
    return summary;
  }
  const ids: Record<Kind, string[]> = { arrivals: [], events: [], news: [] };
  for (const row of claimed) {
    ids[row.kind].push(row.ref_id);
  }

  const [sources, chats] = await Promise.all([
    loadSources(admin, ids),
    admin
      .from("telegram_chats")
      .select("id, post_locale, news_topic, events_topic, arrivals_topic"),
  ]);
  const byLocale: Partial<Record<Locale, Record<Kind, ChatPost[]>>> = {};

  for (const chat of chats.data ?? []) {
    const locale: Locale = chat.post_locale === "en" ? "en" : "ar";
    byLocale[locale] ??= buildPosts(sources, locale);
    for (const kind of ["news", "events", "arrivals"] as const) {
      const threadId = chat[topicColumn[kind]];
      if (threadId === null) {
        continue;
      }
      for (const post of byLocale[locale][kind]) {
        try {
          // biome-ignore lint/performance/noAwaitInLoops: one message at a time stays under Telegram's rate limits
          await postToChat(bot.api, { chatId: chat.id, post, threadId });
          summary.sent += 1;
        } catch (failure) {
          summary.failed += 1;
          log.error(
            `Telegram topic post to ${chat.id} failed: ${String(failure)}`
          );
        }
      }
    }
  }
  return summary;
};
