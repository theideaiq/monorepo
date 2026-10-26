/**
 * Droid, The IDEA's Telegram bot (@TheIdeaDroidBot).
 *
 * `createBot` builds a grammY bot from injected dependencies (database
 * access and a key-value store), so it runs the same in the webhook route
 * and in offline tests.
 *
 * - Private chats: a menu. Members who linked Telegram to The IDEA Pass
 *   track their orders, see their Bulbs and open support tickets; everyone
 *   can search the store, read the FAQ and the newsletter.
 * - Inline mode: `@TheIdeaDroidBot <product>` in any chat shares products.
 * - Groups and channels: the bot records membership in the chats it's an
 *   admin of, approves join requests by each chat's rule (open, linked The
 *   IDEA Pass or a Bulbs tier) and sends new channel posts to newsletter
 *   subscribers.
 *   Moderation is left to Telegram's own tools.
 */

import { BULB_VALUE_IQD, formatPrice } from "@repo/commerce";
import { localePath } from "@repo/internationalization";
import { Bot, type Context, GrammyError, InlineKeyboard } from "grammy";
import type {
  InlineQueryResultArticle,
  User,
  UserFromGetMe,
} from "grammy/types";
import type {
  DroidData,
  FaqTopic,
  MemberProfile,
  TelegramChat,
  TelegramMember,
} from "./data";
import { type BotLocale, localeOf, type MessageKey, t } from "./i18n";
import { escapeHtml, productHtml, summarizeProduct } from "./products";
import type { KeyValueStore } from "./store";

export const SITE_URL = "https://theideaiq.com";
export const CLUB_URL = "https://t.me/theideaclub";
/** Updates older than this are dropped (the bot was down or redeployed). */
export const STALE_UPDATE_SECONDS = 5 * 60;

const CHAT_CACHE_SECONDS = 5 * 60;
const MEMBER_CACHE_SECONDS = 6 * 60 * 60;
const PENDING_SECONDS = 15 * 60;
const SEARCH_LIMIT = 5;
const INLINE_LIMIT = 10;
const ORDERS_LIMIT = 3;
const NEWSLETTER_PAGE = 100;
const FAQ_TOPICS: FaqTopic[] = ["general", "store", "plus", "club", "business"];
const FAQ_BUTTON_LENGTH = 60;
const POST_DEDUPE_SECONDS = 24 * 60 * 60;
const MENU_CALLBACK = /^m:(\w+)$/;
const FAQ_TOPIC_CALLBACK = /^faq:t:(\w+)$/;
const FAQ_QUESTION_CALLBACK = /^faq:q:([\w-]+)$/;

/** Updates the webhook subscribes to (`chat_member` must be asked for). */
export const ALLOWED_UPDATES = [
  "message",
  "callback_query",
  "inline_query",
  "chat_join_request",
  "channel_post",
  "chat_member",
  "my_chat_member",
] as const;

/** Command lists for `setMyCommands`, per language and audience. */
export const DROID_COMMANDS: Record<
  BotLocale,
  {
    admins: { command: string; description: string }[];
    private: { command: string; description: string }[];
  }
> = {
  ar: {
    admins: [{ command: "search", description: "البحث في المتجر" }],
    private: [
      { command: "start", description: "القائمة الرئيسية" },
      { command: "orders", description: "تتبّع طلباتي" },
      { command: "bulbs", description: "رصيدي من Bulbs" },
      { command: "search", description: "البحث في المتجر" },
      { command: "support", description: "تحدّث معنا" },
    ],
  },
  en: {
    admins: [{ command: "search", description: "Search the store" }],
    private: [
      { command: "start", description: "Main menu" },
      { command: "orders", description: "Track my orders" },
      { command: "bulbs", description: "My Bulbs" },
      { command: "search", description: "Search the store" },
      { command: "support", description: "Talk to us" },
    ],
  },
};

export interface Logger {
  error: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
}

export interface DroidOptions {
  /** The app's URL for the Links menu, if any. */
  appUrl?: string;
  /** Skips `getMe` (tests, or a cached copy). */
  botInfo?: UserFromGetMe;
  clubUrl?: string;
  data: DroidData;
  logger?: Logger;
  now?: () => number;
  siteUrl?: string;
  store: KeyValueStore;
  token: string;
}

interface Runtime {
  appUrl?: string;
  clubUrl: string;
  data: DroidData;
  logger: Logger;
  now: () => number;
  siteUrl: string;
  store: KeyValueStore;
}

export interface DroidFlavor {
  droid: Runtime;
  locale: BotLocale;
}

export type DroidContext = Context & DroidFlavor;

type Pending = "search" | "support";

const profileOf = (user: User): MemberProfile => ({
  first_name: user.first_name,
  id: user.id,
  language_code: user.language_code ?? null,
  last_name: user.last_name ?? null,
  username: user.username ?? null,
});

/** Banned when kicked, unbanned when an admin lifts the ban, else unchanged. */
const banChange = (previous: string, next: string) => {
  if (next === "kicked") {
    return true;
  }
  return previous === "kicked" ? false : undefined;
};

const describeError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** A path on the website in the person's language. */
const siteLink = (ctx: DroidContext, path: string) =>
  `${ctx.droid.siteUrl}${localePath(ctx.locale, path)}`;

// ── Cached lookups ──────────────────────────────────────────────────────────

const getChat = async (
  { data, store }: Runtime,
  chatId: number
): Promise<TelegramChat | null> => {
  const key = `chat:${chatId}`;
  const cached = await store.get<{ chat: TelegramChat | null }>(key);
  if (cached) {
    return cached.chat;
  }
  const chat = await data.getChat(chatId);
  await store.set(key, { chat }, CHAT_CACHE_SECONDS);
  return chat;
};

const forgetChat = async ({ store }: Runtime, chatId: number) => {
  await store.delete(`chat:${chatId}`);
};

const pendingKey = (userId: number) => `pending:${userId}`;

// ── Private chat: menu and features ─────────────────────────────────────────

const menuKeyboard = (ctx: DroidContext, member: TelegramMember | null) => {
  const { locale } = ctx;
  return (
    new InlineKeyboard()
      // The website as a Mini App, signed in with Telegram (/tg).
      .webApp(t(locale, "shop"), siteLink(ctx, "/tg"))
      .row()
      .text(t(locale, "orders"), "m:orders")
      .text(t(locale, "bulbs"), "m:bulbs")
      .row()
      .text(t(locale, "search"), "m:search")
      .row()
      .text(t(locale, "support"), "m:support")
      .row()
      .text(t(locale, "plus"), "m:plus")
      .text(t(locale, "faq"), "m:faq")
      .row()
      .text(t(locale, "links"), "m:links")
      .row()
      .text(
        t(locale, member?.newsletter_opt_in ? "newsletterOn" : "newsletterOff"),
        "m:news"
      )
  );
};

const backKeyboard = (locale: BotLocale, target = "m:home") =>
  new InlineKeyboard().text(t(locale, "back"), target);

/** Edits the menu message for button presses, replies otherwise. */
const respond = async (
  ctx: DroidContext,
  text: string,
  other: { reply_markup?: InlineKeyboard } = {}
) => {
  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, other);
      return;
    } catch (error) {
      if (
        error instanceof GrammyError &&
        error.description.includes("message is not modified")
      ) {
        return;
      }
    }
  }
  await ctx.reply(text, other);
};

const showMenu = async (ctx: DroidContext) => {
  if (!ctx.from) {
    return;
  }
  const member = await ctx.droid.data.getMember(ctx.from.id);
  await respond(
    ctx,
    t(ctx.locale, "menuGreeting", { name: ctx.from.first_name }),
    {
      reply_markup: menuKeyboard(ctx, member),
    }
  );
};

/**
 * The IDEA Pass member behind this Telegram account; otherwise explains how
 * to connect it and returns null.
 */
const linkedUser = async (ctx: DroidContext) => {
  if (!ctx.from) {
    return null;
  }
  const userId = await ctx.droid.data.getLinkedUser(ctx.from.id);
  if (!userId) {
    await respond(ctx, t(ctx.locale, "notLinked"), {
      reply_markup: new InlineKeyboard()
        .url(t(ctx.locale, "connect"), siteLink(ctx, "/pass/settings"))
        .row()
        .text(t(ctx.locale, "back"), "m:home"),
    });
  }
  return userId;
};

const showOrders = async (ctx: DroidContext) => {
  const userId = await linkedUser(ctx);
  if (!userId) {
    return;
  }
  const orders = await ctx.droid.data.listOrders(userId, ORDERS_LIMIT);
  const lines = orders.map((order) =>
    t(ctx.locale, "orderLine", {
      number: order.number,
      status: t(ctx.locale, `orderStatus_${order.status}` as MessageKey),
      total: formatPrice(order.total, ctx.locale),
    })
  );
  await respond(
    ctx,
    orders.length > 0
      ? [t(ctx.locale, "ordersTitle"), ...lines].join("\n")
      : t(ctx.locale, "ordersEmpty"),
    {
      reply_markup: new InlineKeyboard()
        .url(t(ctx.locale, "ordersOpen"), siteLink(ctx, "/pass/orders"))
        .row()
        .text(t(ctx.locale, "back"), "m:home"),
    }
  );
};

const showBulbs = async (ctx: DroidContext) => {
  const userId = await linkedUser(ctx);
  if (!userId) {
    return;
  }
  const { available, pending } = await ctx.droid.data.getBulbs(userId);
  const text = [
    t(ctx.locale, "bulbsText", {
      available,
      worth: formatPrice(available * BULB_VALUE_IQD, ctx.locale),
    }),
    pending > 0 ? t(ctx.locale, "bulbsPending", { pending }) : null,
  ]
    .filter(Boolean)
    .join("\n");
  await respond(ctx, text, {
    reply_markup: new InlineKeyboard()
      .url(t(ctx.locale, "bulbsOpen"), siteLink(ctx, "/pass/bulbs"))
      .row()
      .text(t(ctx.locale, "back"), "m:home"),
  });
};

const askFor = async (ctx: DroidContext, pending: Pending) => {
  if (!ctx.from) {
    return;
  }
  await ctx.droid.store.set<Pending>(
    pendingKey(ctx.from.id),
    pending,
    PENDING_SECONDS
  );
  await ctx.reply(
    t(ctx.locale, pending === "search" ? "searchPrompt" : "supportPrompt")
  );
};

/**
 * "Talk to us": a support ticket for members (answered in My Pass →
 * Support), a Telegram request for everyone else (answered here).
 */
const submitSupport = async (ctx: DroidContext, rawMessage: string) => {
  if (!ctx.from) {
    return;
  }
  const message = rawMessage.trim().slice(0, 2000);
  const { data } = ctx.droid;
  const userId = await data.getLinkedUser(ctx.from.id);
  if (userId) {
    const number = await data.createTicket(userId, message);
    await ctx.reply(t(ctx.locale, "supportSent", { number }));
    return;
  }
  await data.createRequest(ctx.from.id, message);
  await ctx.reply(t(ctx.locale, "supportSentTelegram"));
};

const runSearch = async (ctx: DroidContext, rawQuery: string) => {
  const query = rawQuery.trim().slice(0, 100);
  if (!query) {
    await ctx.reply(t(ctx.locale, "searchUsage"));
    return;
  }
  const { data, siteUrl } = ctx.droid;
  const products = await data.searchProducts(query, SEARCH_LIMIT);
  if (products.length === 0) {
    await ctx.reply(t(ctx.locale, "searchEmpty", { query }));
    return;
  }
  const blocks = products.map((product) =>
    productHtml(summarizeProduct(product, ctx.locale, siteUrl), ctx.locale)
  );
  await ctx.reply(
    [escapeHtml(t(ctx.locale, "searchResults", { query })), ...blocks].join(
      "\n\n"
    ),
    { link_preview_options: { is_disabled: true }, parse_mode: "HTML" }
  );
};

const showFaqTopics = async (ctx: DroidContext) => {
  const entries = await ctx.droid.data.listFaq();
  const topics = FAQ_TOPICS.filter((topic) =>
    entries.some((entry) => entry.topic === topic)
  );
  if (topics.length === 0) {
    await respond(ctx, t(ctx.locale, "faqEmpty"), {
      reply_markup: backKeyboard(ctx.locale),
    });
    return;
  }
  const keyboard = new InlineKeyboard();
  for (const topic of topics) {
    keyboard.text(t(ctx.locale, `faqTopic_${topic}`), `faq:t:${topic}`).row();
  }
  keyboard.text(t(ctx.locale, "back"), "m:home");
  await respond(ctx, t(ctx.locale, "faqPickTopic"), { reply_markup: keyboard });
};

const showFaqQuestions = async (ctx: DroidContext, topic: FaqTopic) => {
  const entries = await ctx.droid.data.listFaq(topic);
  const keyboard = new InlineKeyboard();
  for (const entry of entries) {
    const question =
      ctx.locale === "en" ? entry.question_en : entry.question_ar;
    const label =
      question.length > FAQ_BUTTON_LENGTH
        ? `${question.slice(0, FAQ_BUTTON_LENGTH - 1)}…`
        : question;
    keyboard.text(label, `faq:q:${entry.id}`).row();
  }
  keyboard.text(t(ctx.locale, "back"), "m:faq");
  await respond(
    ctx,
    t(ctx.locale, entries.length > 0 ? "faqPickQuestion" : "faqEmpty"),
    { reply_markup: keyboard }
  );
};

const showFaqAnswer = async (ctx: DroidContext, id: string) => {
  const entry = await ctx.droid.data.getFaq(id);
  if (!entry) {
    await showFaqTopics(ctx);
    return;
  }
  const [question, answer] =
    ctx.locale === "en"
      ? [entry.question_en, entry.answer_en]
      : [entry.question_ar, entry.answer_ar];
  await respond(ctx, `${question}\n\n${answer}`, {
    reply_markup: new InlineKeyboard()
      .text(t(ctx.locale, "back"), `faq:t:${entry.topic}`)
      .text(t(ctx.locale, "faq"), "m:faq"),
  });
};

const showLinks = async (ctx: DroidContext) => {
  const { appUrl, clubUrl, siteUrl } = ctx.droid;
  const keyboard = new InlineKeyboard()
    .url(t(ctx.locale, "linkWebsite"), `${siteUrl}${localePath(ctx.locale)}`)
    .row()
    .url(t(ctx.locale, "linkClub"), clubUrl)
    .row();
  if (appUrl) {
    keyboard.url(t(ctx.locale, "linkApp"), appUrl).row();
  }
  keyboard.text(t(ctx.locale, "back"), "m:home");
  await respond(ctx, t(ctx.locale, "linksTitle"), { reply_markup: keyboard });
};

const showPlus = async (ctx: DroidContext) => {
  await respond(ctx, t(ctx.locale, "plusText"), {
    reply_markup: new InlineKeyboard()
      .url(
        t(ctx.locale, "plusOpen"),
        `${ctx.droid.siteUrl}${localePath(ctx.locale, "/plus")}`
      )
      .row()
      .text(t(ctx.locale, "back"), "m:home"),
  });
};

const toggleNewsletter = async (ctx: DroidContext) => {
  if (!ctx.from) {
    return;
  }
  const { data } = ctx.droid;
  let member = await data.getMember(ctx.from.id);
  if (!member) {
    await data.upsertMember(profileOf(ctx.from));
  }
  const optIn = !member?.newsletter_opt_in;
  await data.setNewsletter(ctx.from.id, optIn);
  member = await data.getMember(ctx.from.id);
  await ctx.answerCallbackQuery({
    text: t(ctx.locale, optIn ? "newsletterNowOn" : "newsletterNowOff"),
  });
  await respond(
    ctx,
    t(ctx.locale, "menuGreeting", { name: ctx.from.first_name }),
    { reply_markup: menuKeyboard(ctx, member) }
  );
};

/** `@TheIdeaDroidBot <product>` in any chat: products to share. */
const answerInline = async (ctx: DroidContext) => {
  const query = ctx.inlineQuery?.query.trim().slice(0, 100) ?? "";
  if (!query) {
    await ctx.answerInlineQuery([], { cache_time: 300 });
    return;
  }
  const { data, siteUrl } = ctx.droid;
  const products = await data.searchProducts(query, INLINE_LIMIT);
  const results: InlineQueryResultArticle[] = products.map((product) => {
    const summary = summarizeProduct(product, ctx.locale, siteUrl);
    return {
      description: [
        summary.price ?? t(ctx.locale, "rental"),
        summary.stock,
      ].join(" · "),
      id: product.id,
      input_message_content: {
        link_preview_options: { url: summary.url },
        message_text: productHtml(summary, ctx.locale),
        parse_mode: "HTML",
      },
      reply_markup: new InlineKeyboard().url(
        t(ctx.locale, "inlineOpen"),
        summary.url
      ),
      title: summary.name,
      type: "article",
      url: summary.url,
    };
  });
  await ctx.answerInlineQuery(results, { cache_time: 60 });
};

// ── The Club: join requests ─────────────────────────────────────────────────

/**
 * Approves a join request that passes the chat's rule (open, linked The
 * IDEA Pass, or a Bulbs tier); otherwise declines it and tells the person
 * how to get in. Chats without a rule are left to their admins.
 */
const handleJoinRequest = async (ctx: DroidContext) => {
  const request = ctx.chatJoinRequest;
  if (!request || request.from.is_bot) {
    return;
  }
  const { chat, from } = request;
  const check = await ctx.droid.data.joinCheck(chat.id, from.id);
  if (!check) {
    return;
  }
  if (check.allowed) {
    await ctx.api.approveChatJoinRequest(chat.id, from.id);
    return;
  }
  await ctx.api.declineChatJoinRequest(chat.id, from.id);
  const locale = localeOf(from.language_code);
  const title = "title" in chat ? (chat.title ?? "") : "";
  const needsTier = check.linked && check.needed;
  try {
    await ctx.api.sendMessage(
      request.user_chat_id,
      needsTier
        ? t(locale, "joinNeedsTier", {
            chat: title,
            tier: t(locale, `tier_${check.needed}` as MessageKey),
          })
        : t(locale, "joinNotLinked", { chat: title }),
      {
        reply_markup: new InlineKeyboard().url(
          t(locale, needsTier ? "bulbsOpen" : "connect"),
          `${ctx.droid.siteUrl}${localePath(locale, needsTier ? "/pass/bulbs" : "/pass/settings")}`
        ),
      }
    );
  } catch (error) {
    ctx.droid.logger.error("Droid could not explain a declined join", {
      error: describeError(error),
    });
  }
};

// ── Channels: the newsletter ────────────────────────────────────────────────

const sendNewsletterPost = async (
  ctx: DroidContext,
  member: { id: number; language_code: string | null },
  channel: string,
  url: string
) => {
  const locale = localeOf(member.language_code ?? undefined);
  try {
    await ctx.api.sendMessage(member.id, t(locale, "newPost", { channel }), {
      reply_markup: new InlineKeyboard().url(t(locale, "newPostOpen"), url),
    });
  } catch (error) {
    // Blocked the bot or deleted the account: stop sending to them.
    if (error instanceof GrammyError && error.error_code === 403) {
      await ctx.droid.data.setNewsletter(member.id, false);
      return;
    }
    ctx.droid.logger.error("Droid newsletter message failed", {
      error: describeError(error),
      memberId: member.id,
    });
  }
};

/** Sends a new post of a registered public channel to subscribers, once. */
const broadcastPost = async (ctx: DroidContext) => {
  const post = ctx.channelPost;
  if (!post?.chat.username) {
    return;
  }
  const { data, store } = ctx.droid;
  const sentKey = `post:${post.chat.id}:${post.message_id}`;
  if (!(await getChat(ctx.droid, post.chat.id)) || (await store.get(sentKey))) {
    return;
  }
  await store.set(sentKey, true, POST_DEDUPE_SECONDS);

  const url = `https://t.me/${post.chat.username}/${post.message_id}`;
  const channel = post.chat.title;
  for (let offset = 0; ; offset += NEWSLETTER_PAGE) {
    // biome-ignore lint/performance/noAwaitInLoops: pages are read one after another
    const members = await data.listNewsletterMembers(offset, NEWSLETTER_PAGE);
    for (const member of members) {
      // biome-ignore lint/performance/noAwaitInLoops: one message at a time stays under Telegram's rate limits
      await sendNewsletterPost(ctx, member, channel, url);
    }
    if (members.length < NEWSLETTER_PAGE) {
      return;
    }
  }
};

// ── The bot ─────────────────────────────────────────────────────────────────

export const createBot = (options: DroidOptions) => {
  const runtime: Runtime = {
    appUrl: options.appUrl,
    clubUrl: options.clubUrl ?? CLUB_URL,
    data: options.data,
    logger: options.logger ?? console,
    now: options.now ?? Date.now,
    siteUrl: options.siteUrl ?? SITE_URL,
    store: options.store,
  };

  const bot = new Bot<DroidContext>(options.token, {
    botInfo: options.botInfo,
  });

  bot.use(async (ctx, next) => {
    ctx.droid = runtime;
    ctx.locale = localeOf(ctx.from?.language_code);
    await next();
  });

  // Drop messages that waited too long (the bot was down or redeploying):
  // acting on them now would surprise people.
  bot.use(async (ctx, next) => {
    const { update } = ctx;
    const date = update.message?.date ?? update.channel_post?.date;
    if (
      date !== undefined &&
      runtime.now() / 1000 - date > STALE_UPDATE_SECONDS
    ) {
      return;
    }
    await next();
  });

  // Keep telegram_members current for everyone who interacts with the bot.
  bot.use(async (ctx, next) => {
    const user = ctx.from;
    if (user && !user.is_bot) {
      const profile = profileOf(user);
      const signature = JSON.stringify(profile);
      const key = `member:${user.id}`;
      try {
        if ((await runtime.store.get<string>(key)) !== signature) {
          await runtime.data.upsertMember(profile);
          await runtime.store.set(key, signature, MEMBER_CACHE_SECONDS);
        }
      } catch (error) {
        runtime.logger.error("Droid could not save a member", {
          error: describeError(error),
        });
      }
    }
    await next();
  });

  // The bot was added to, promoted in or removed from a chat.
  bot.on("my_chat_member", async (ctx) => {
    const { chat, new_chat_member: member } = ctx.myChatMember;
    await forgetChat(runtime, chat.id);
    if (chat.type === "private") {
      return;
    }
    if (member.status === "administrator") {
      await runtime.data.saveChat({
        id: chat.id,
        title: chat.title,
        username: "username" in chat ? (chat.username ?? null) : null,
      });
      runtime.logger.info("Droid registered a chat", { chatId: chat.id });
    }
  });

  // Membership changes in registered chats (needs `chat_member` updates).
  bot.on("chat_member", async (ctx) => {
    const {
      chat,
      new_chat_member: next,
      old_chat_member: previous,
    } = ctx.chatMember;
    if (next.status === previous.status || next.user.is_bot) {
      return;
    }
    if (!(await getChat(runtime, chat.id))) {
      return;
    }
    await runtime.data.setMemberStatus(
      profileOf(next.user),
      next.status,
      banChange(previous.status, next.status)
    );
  });

  // New channel posts go to newsletter subscribers.
  bot.on("channel_post", (ctx) => broadcastPost(ctx));

  bot.on("inline_query", (ctx) => answerInline(ctx));

  bot.on("chat_join_request", (ctx) => handleJoinRequest(ctx));

  bot.command("search", async (ctx) => {
    if (!ctx.match.trim() && ctx.chat.type === "private") {
      await askFor(ctx, "search");
      return;
    }
    await runSearch(ctx, ctx.match);
  });

  const direct = bot.chatType("private");

  direct.command(["start", "menu", "help"], async (ctx) => {
    await runtime.store.delete(pendingKey(ctx.from.id));
    await showMenu(ctx);
  });
  direct.command("orders", (ctx) => showOrders(ctx));
  direct.command("bulbs", (ctx) => showBulbs(ctx));
  direct.command("support", async (ctx) => {
    await (ctx.match.trim()
      ? submitSupport(ctx, ctx.match)
      : askFor(ctx, "support"));
  });

  direct.on("message:text", async (ctx) => {
    const { text } = ctx.msg;
    if (text.startsWith("/")) {
      await showMenu(ctx);
      return;
    }
    const key = pendingKey(ctx.from.id);
    const pending = await runtime.store.get<Pending>(key);
    if (pending) {
      await runtime.store.delete(key);
      await (pending === "search"
        ? runSearch(ctx, text)
        : submitSupport(ctx, text));
      return;
    }
    await showMenu(ctx);
  });

  bot.callbackQuery(MENU_CALLBACK, async (ctx) => {
    const [, action] = ctx.match;
    switch (action) {
      case "bulbs":
        await showBulbs(ctx);
        break;
      case "faq":
        await showFaqTopics(ctx);
        break;
      case "links":
        await showLinks(ctx);
        break;
      case "news":
        await toggleNewsletter(ctx);
        return;
      case "orders":
        await showOrders(ctx);
        break;
      case "plus":
        await showPlus(ctx);
        break;
      case "search":
        await askFor(ctx, "search");
        break;
      case "support":
        await askFor(ctx, "support");
        break;
      default:
        await showMenu(ctx);
    }
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(FAQ_TOPIC_CALLBACK, async (ctx) => {
    const topic = ctx.match[1] as FaqTopic;
    await (FAQ_TOPICS.includes(topic)
      ? showFaqQuestions(ctx, topic)
      : showFaqTopics(ctx));
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(FAQ_QUESTION_CALLBACK, async (ctx) => {
    await showFaqAnswer(ctx, ctx.match[1] ?? "");
    await ctx.answerCallbackQuery();
  });

  // Buttons from old menus (unban, the assistant).
  bot.on("callback_query", async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  return bot;
};

export type DroidBot = ReturnType<typeof createBot>;

/**
 * Sends a notification (an order update, a support reply…) to a member on
 * Telegram: its title and text, with a button to open it on the website.
 * False when they blocked the bot or never started it.
 */
export const notifyMember = async (
  api: DroidBot["api"],
  {
    body,
    locale,
    telegramId,
    title,
    url,
  }: {
    body: string;
    locale: BotLocale;
    telegramId: number;
    title: string;
    url: string;
  }
) => {
  try {
    await api.sendMessage(
      telegramId,
      `<b>${escapeHtml(title)}</b>\n${escapeHtml(body)}`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().url(
          t(locale, "notificationOpen"),
          url
        ),
      }
    );
    return true;
  } catch (error) {
    if (error instanceof GrammyError && error.error_code === 403) {
      return false;
    }
    throw error;
  }
};

/** A post for the Club's topics: a title, lines under it, a picture and a button. */
export interface ChatPost {
  buttonLabel: string;
  lines: string[];
  /** An https image URL, or null for a text post. */
  photo: string | null;
  title: string;
  url: string;
}

/**
 * Posts to a chat Droid runs, in a forum topic (`threadId`; 0 for the chat
 * itself): a photo with the text as its caption, or a text message.
 */
export const postToChat = async (
  api: DroidBot["api"],
  {
    chatId,
    post,
    threadId,
  }: { chatId: number; post: ChatPost; threadId: number }
) => {
  const text = [
    `<b>${escapeHtml(post.title)}</b>`,
    ...post.lines.map(escapeHtml),
  ].join("\n");
  const other = {
    ...(threadId > 0 && { message_thread_id: threadId }),
    parse_mode: "HTML" as const,
    reply_markup: new InlineKeyboard().url(post.buttonLabel, post.url),
  };
  if (post.photo) {
    await api.sendPhoto(chatId, post.photo, { caption: text, ...other });
  } else {
    await api.sendMessage(chatId, text, other);
  }
};
