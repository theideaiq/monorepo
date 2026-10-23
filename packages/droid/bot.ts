/**
 * Droid, The IDEA's Telegram bot (@TheIdeaDroidBot).
 *
 * `createBot` builds a grammY bot from injected dependencies (database
 * access, a key-value store, an optional AI model), so it runs the same in
 * the webhook route and in offline tests.
 *
 * - Private chats: a menu (store search, IDEA Plus, FAQ, links, newsletter,
 *   unban requests) and, when an AI model is configured, an assistant.
 * - Moderated groups: banned words and investment spam are deleted (edits
 *   too), repeated messages are muted, admins can /ban across every
 *   moderated group, new members are welcomed and membership changes are
 *   recorded.
 * - Channels: new posts are sent to newsletter subscribers.
 */
import type { LanguageModel } from "ai";
import { Bot, GrammyError, InlineKeyboard, type Context } from "grammy";
import type { ChatMember, User, UserFromGetMe } from "grammy/types";
import { askAssistant } from "./assistant";
import type {
  DroidData,
  FaqTopic,
  MemberProfile,
  TelegramChat,
  TelegramMember,
} from "./data";
import { FLOOD_MUTE_SECONDS, trackFlood } from "./flood";
import { type BotLocale, localeOf, type MessageKey, t } from "./i18n";
import { createModerator, detectSpam, type Moderator } from "./moderation";
import { escapeHtml, productHtml, summarizeProduct } from "./products";
import type { KeyValueStore } from "./store";

export const SITE_URL = "https://theideaiq.com";
export const CLUB_URL = "https://t.me/theideaclub";
/** Updates older than this are dropped (the bot was down or redeployed). */
export const STALE_UPDATE_SECONDS = 5 * 60;

const CHAT_CACHE_SECONDS = 5 * 60;
const ADMINS_CACHE_SECONDS = 10 * 60;
const MEMBER_CACHE_SECONDS = 6 * 60 * 60;
const PENDING_SECONDS = 15 * 60;
const SEARCH_LIMIT = 5;
const NEWSLETTER_PAGE = 100;
const FAQ_TOPICS: FaqTopic[] = ["general", "store", "plus", "academy", "suite"];
const FAQ_BUTTON_LENGTH = 60;

/** Updates the webhook subscribes to (`chat_member` must be asked for). */
export const ALLOWED_UPDATES = [
  "message",
  "edited_message",
  "callback_query",
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
    admins: [
      { command: "ban", description: "حظر مستخدم من كل المجموعات" },
      { command: "search", description: "البحث في المتجر" },
    ],
    private: [
      { command: "start", description: "القائمة الرئيسية" },
      { command: "search", description: "البحث في المتجر" },
      { command: "menu", description: "عرض القائمة" },
    ],
  },
  en: {
    admins: [
      { command: "ban", description: "Ban a user from every group" },
      { command: "search", description: "Search the store" },
    ],
    private: [
      { command: "start", description: "Main menu" },
      { command: "search", description: "Search the store" },
      { command: "menu", description: "Show the menu" },
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
  /** Without a model, private messages get the menu. */
  model?: LanguageModel;
  moderator?: Moderator;
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
  model?: LanguageModel;
  moderator: Moderator;
  now: () => number;
  siteUrl: string;
  store: KeyValueStore;
}

export interface DroidFlavor {
  droid: Runtime;
  locale: BotLocale;
}

export type DroidContext = Context & DroidFlavor;

interface ChatAdmins {
  canDelete: boolean;
  canRestrict: boolean;
  ids: number[];
}

type Pending = "search" | "unban";

const ADMIN_STATUSES = new Set(["administrator", "creator"]);

const profileOf = (user: User): MemberProfile => ({
  first_name: user.first_name,
  id: user.id,
  language_code: user.language_code ?? null,
  last_name: user.last_name ?? null,
  username: user.username ?? null,
});

const displayName = (user: Pick<User, "first_name" | "username">) =>
  user.username ? `@${user.username}` : user.first_name;

const memberName = (member: MemberProfile) =>
  member.username ? `@${member.username}` : (member.first_name ?? String(member.id));

const isMember = (member: ChatMember) =>
  member.status === "member" ||
  member.status === "administrator" ||
  member.status === "creator" ||
  (member.status === "restricted" && member.is_member);

const describeError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

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

const getAdmins = async (ctx: DroidContext, chatId: number) => {
  const key = `admins:${chatId}`;
  const cached = await ctx.droid.store.get<ChatAdmins>(key);
  if (cached) {
    return cached;
  }
  const members = await ctx.api.getChatAdministrators(chatId);
  const self = members.find((member) => member.user.id === ctx.me.id);
  const admins: ChatAdmins = {
    canDelete:
      self?.status === "creator" ||
      (self?.status === "administrator" && self.can_delete_messages),
    canRestrict:
      self?.status === "creator" ||
      (self?.status === "administrator" && self.can_restrict_members),
    ids: members.map((member) => member.user.id),
  };
  await ctx.droid.store.set(key, admins, ADMINS_CACHE_SECONDS);
  return admins;
};

const forgetChat = async ({ store }: Runtime, chatId: number) => {
  await Promise.all([
    store.delete(`chat:${chatId}`),
    store.delete(`admins:${chatId}`),
  ]);
};

const pendingKey = (userId: number) => `pending:${userId}`;

// ── Private chat: menu and features ─────────────────────────────────────────

const menuKeyboard = (locale: BotLocale, member: TelegramMember | null) => {
  const keyboard = new InlineKeyboard()
    .text(t(locale, "search"), "m:search")
    .row()
    .text(t(locale, "plus"), "m:plus")
    .text(t(locale, "faq"), "m:faq")
    .row()
    .text(t(locale, "links"), "m:links")
    .row()
    .text(
      t(locale, member?.newsletter_opt_in ? "newsletterOn" : "newsletterOff"),
      "m:news"
    );
  if (member?.banned_at) {
    keyboard.row().text(t(locale, "unban"), "m:unban");
  }
  return keyboard;
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
  const key: MessageKey = ctx.droid.model ? "menuGreetingAi" : "menuGreeting";
  await respond(ctx, t(ctx.locale, key, { name: ctx.from.first_name }), {
    reply_markup: menuKeyboard(ctx.locale, member),
  });
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
    const question = ctx.locale === "en" ? entry.question_en : entry.question_ar;
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
    .url(t(ctx.locale, "linkWebsite"), `${siteUrl}/${ctx.locale}`)
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
      .url(t(ctx.locale, "plusOpen"), `${ctx.droid.siteUrl}/${ctx.locale}/plus`)
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
    t(ctx.locale, ctx.droid.model ? "menuGreetingAi" : "menuGreeting", {
      name: ctx.from.first_name,
    }),
    { reply_markup: menuKeyboard(ctx.locale, member) }
  );
};

/** Null when the person may send an unban request, else the reason not. */
const unbanBlocker = async (
  ctx: DroidContext,
  userId: number
): Promise<MessageKey | null> => {
  const member = await ctx.droid.data.getMember(userId);
  if (!member?.banned_at) {
    return "unbanNotBanned";
  }
  if (await ctx.droid.data.hasOpenRequest(userId, "unban")) {
    return "unbanDuplicate";
  }
  return null;
};

const startUnban = async (ctx: DroidContext) => {
  if (!ctx.from) {
    return;
  }
  const blocker = await unbanBlocker(ctx, ctx.from.id);
  if (blocker) {
    await ctx.reply(t(ctx.locale, blocker));
    return;
  }
  await ctx.droid.store.set<Pending>(
    pendingKey(ctx.from.id),
    "unban",
    PENDING_SECONDS
  );
  await ctx.reply(t(ctx.locale, "unbanPrompt"));
};

const submitUnban = async (ctx: DroidContext, message: string) => {
  if (!ctx.from) {
    return;
  }
  const blocker = await unbanBlocker(ctx, ctx.from.id);
  if (blocker) {
    await ctx.reply(t(ctx.locale, blocker));
    return;
  }
  await ctx.droid.data.createRequest(
    ctx.from.id,
    "unban",
    message.trim().slice(0, 2000)
  );
  await ctx.reply(t(ctx.locale, "unbanSent"));
};

const answerWithAssistant = async (ctx: DroidContext, text: string) => {
  const { appUrl, data, logger, model, siteUrl, store } = ctx.droid;
  if (!(model && ctx.from)) {
    await showMenu(ctx);
    return;
  }
  await ctx.replyWithChatAction("typing").catch(() => undefined);
  try {
    const reply = await askAssistant({
      appUrl,
      data,
      locale: ctx.locale,
      model,
      siteUrl,
      store,
      text: text.slice(0, 2000),
      userId: ctx.from.id,
    });
    await ctx.reply(reply, { link_preview_options: { is_disabled: true } });
  } catch (error) {
    logger.error("Droid assistant failed", { error: describeError(error) });
    const member = await data.getMember(ctx.from.id);
    await ctx.reply(t(ctx.locale, "aiError"), {
      reply_markup: menuKeyboard(ctx.locale, member),
    });
  }
};

// ── Groups: moderation, /ban, membership ────────────────────────────────────

const deleteMessages = async (
  ctx: DroidContext,
  chatId: number,
  messageIds: number[]
) => {
  try {
    await ctx.api.deleteMessages(chatId, messageIds);
  } catch (error) {
    ctx.droid.logger.error("Droid could not delete messages", {
      chatId,
      error: describeError(error),
    });
  }
};

const isUnwanted = ({ moderator }: Runtime, text: string) =>
  text.length > 0 && (moderator.find(text) !== null || detectSpam(text).spam);

const muteFlooder = async (
  ctx: DroidContext,
  chatId: number,
  user: User,
  messageIds: number[],
  admins: ChatAdmins
) => {
  if (admins.canDelete) {
    await deleteMessages(ctx, chatId, messageIds);
  }
  if (!admins.canRestrict) {
    return;
  }
  await ctx.api.restrictChatMember(
    chatId,
    user.id,
    {
      can_send_audios: false,
      can_send_documents: false,
      can_send_messages: false,
      can_send_other_messages: false,
      can_send_photos: false,
      can_send_polls: false,
      can_send_video_notes: false,
      can_send_videos: false,
      can_send_voice_notes: false,
    },
    {
      until_date: Math.floor(ctx.droid.now() / 1000) + FLOOD_MUTE_SECONDS,
    }
  );
  await ctx.api.sendMessage(
    chatId,
    t(localeOf(user.language_code), "floodWarning", { name: displayName(user) })
  );
};

const banEverywhere = async (
  ctx: DroidContext,
  target: MemberProfile,
  currentChatId: number
) => {
  const chats = await ctx.droid.data.listModeratedChats();
  const chatIds = new Set([currentChatId, ...chats.map((chat) => chat.id)]);
  let banned = 0;
  for (const chatId of chatIds) {
    try {
      // biome-ignore lint/performance/noAwaitInLoops: a few groups, in order, to stay under Telegram's rate limits
      await ctx.api.banChatMember(chatId, target.id);
      banned++;
    } catch (error) {
      ctx.droid.logger.error("Droid could not ban a member", {
        chatId,
        error: describeError(error),
        memberId: target.id,
      });
    }
  }
  await ctx.droid.data.setMemberStatus(target, "kicked", true);
  return banned;
};

// ── The bot ─────────────────────────────────────────────────────────────────

export const createBot = (options: DroidOptions) => {
  const runtime: Runtime = {
    appUrl: options.appUrl,
    clubUrl: options.clubUrl ?? CLUB_URL,
    data: options.data,
    logger: options.logger ?? console,
    model: options.model,
    moderator: options.moderator ?? createModerator(),
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
    const date =
      update.edited_message?.edit_date ??
      update.message?.date ??
      update.channel_post?.date;
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
    if (
      ADMIN_STATUSES.has(next.status) ||
      ADMIN_STATUSES.has(previous.status)
    ) {
      await runtime.store.delete(`admins:${chat.id}`);
    }
    if (next.status === previous.status || next.user.is_bot) {
      return;
    }
    const registered = await getChat(runtime, chat.id);
    if (!registered) {
      return;
    }

    const profile = profileOf(next.user);
    if (next.status === "kicked") {
      await runtime.data.setMemberStatus(profile, "kicked", true);
    } else if (next.status === "member") {
      await runtime.data.setMemberStatus(profile, "member", false);
    } else {
      await runtime.data.setMemberStatus(profile, next.status, undefined);
    }

    if (
      registered.moderated &&
      chat.type !== "channel" &&
      isMember(next) &&
      !isMember(previous)
    ) {
      await ctx.api.sendMessage(
        chat.id,
        t(localeOf(next.user.language_code), "welcome", {
          chat: chat.title ?? "",
          name: displayName(next.user),
        })
      );
    }
  });

  // New channel posts go to newsletter subscribers.
  bot.on("channel_post", async (ctx) => {
    const post = ctx.channelPost;
    const { chat } = post;
    if (!chat.username) {
      return;
    }
    const registered = await getChat(runtime, chat.id);
    const sentKey = `post:${chat.id}:${post.message_id}`;
    if (!registered || (await runtime.store.get(sentKey))) {
      return;
    }
    await runtime.store.set(sentKey, true, 24 * 60 * 60);

    const url = `https://t.me/${chat.username}/${post.message_id}`;
    for (let offset = 0; ; offset += NEWSLETTER_PAGE) {
      // biome-ignore lint/performance/noAwaitInLoops: pages are sent one after another to respect Telegram's rate limits
      const members = await runtime.data.listNewsletterMembers(
        offset,
        NEWSLETTER_PAGE
      );
      for (const member of members) {
        const locale = localeOf(member.language_code ?? undefined);
        try {
          await ctx.api.sendMessage(
            member.id,
            t(locale, "newPost", { channel: chat.title }),
            {
              reply_markup: new InlineKeyboard().url(
                t(locale, "newPostOpen"),
                url
              ),
            }
          );
        } catch (error) {
          // Blocked the bot or deleted the account: stop sending.
          if (error instanceof GrammyError && error.error_code === 403) {
            await runtime.data.setNewsletter(member.id, false);
          } else {
            runtime.logger.error("Droid newsletter message failed", {
              error: describeError(error),
              memberId: member.id,
            });
          }
        }
      }
      if (members.length < NEWSLETTER_PAGE) {
        break;
      }
    }
  });

  const groups = bot.chatType(["group", "supergroup"]);

  // Moderation runs before commands, so "/search <banned word>" is caught.
  groups.on(["message", "edited_message"], async (ctx, next) => {
    const message = ctx.msg;
    const sender = message.from;
    const registered = await getChat(runtime, ctx.chat.id);
    if (
      !(registered?.moderated && sender) ||
      sender.id === ctx.me.id ||
      message.sender_chat?.id === ctx.chat.id ||
      message.is_automatic_forward
    ) {
      await next();
      return;
    }

    const admins = await getAdmins(ctx, ctx.chat.id);
    if (admins.ids.includes(sender.id)) {
      await next();
      return;
    }

    const text = message.text ?? message.caption ?? "";
    if (isUnwanted(runtime, text)) {
      if (admins.canDelete) {
        await deleteMessages(ctx, ctx.chat.id, [message.message_id]);
      }
      runtime.logger.info("Droid removed a message", {
        chatId: ctx.chat.id,
        deleted: admins.canDelete,
        memberId: sender.id,
      });
      return;
    }

    if (ctx.editedMessage) {
      return;
    }

    const content = text || message.sticker?.file_unique_id || "";
    if (content) {
      const flood = await trackFlood(runtime.store, {
        chatId: ctx.chat.id,
        content,
        messageId: message.message_id,
        userId: sender.id,
      });
      if (flood) {
        await muteFlooder(ctx, ctx.chat.id, sender, flood, admins);
        return;
      }
    }

    await next();
  });

  groups.command("ban", async (ctx) => {
    const message = ctx.msg;
    const issuer = ctx.from;
    const anonymousAdmin = message.sender_chat?.id === ctx.chat.id;
    if (!(anonymousAdmin || issuer)) {
      return;
    }
    if (!anonymousAdmin && issuer) {
      const status = (await ctx.getChatMember(issuer.id)).status;
      if (!ADMIN_STATUSES.has(status)) {
        await ctx.reply(t(ctx.locale, "banNotAdmin"), {
          reply_parameters: { message_id: message.message_id },
        });
        return;
      }
    }

    const replied = message.reply_to_message;
    const argument = ctx.match.trim().split(/\s+/)[0] ?? "";
    let target: MemberProfile | null = null;
    if (replied?.from && !replied.from.is_bot && !replied.sender_chat) {
      target = profileOf(replied.from);
    } else if (/^\d+$/.test(argument)) {
      target = await runtime.data.getMember(Number(argument));
    } else if (argument) {
      target = await runtime.data.findMemberByUsername(
        argument.replace(/^@/, "")
      );
    }

    if (!target) {
      await ctx.reply(t(ctx.locale, argument ? "banNotFound" : "banUsage"), {
        reply_parameters: { message_id: message.message_id },
      });
      return;
    }

    const targetStatus = await ctx
      .getChatMember(target.id)
      .then((member) => member.status)
      .catch(() => "left");
    if (ADMIN_STATUSES.has(targetStatus)) {
      await ctx.reply(t(ctx.locale, "banProtected"), {
        reply_parameters: { message_id: message.message_id },
      });
      return;
    }

    const count = await banEverywhere(ctx, target, ctx.chat.id);
    if (replied) {
      await deleteMessages(ctx, ctx.chat.id, [replied.message_id]);
    }
    await ctx.reply(
      t(ctx.locale, "banDone", { count, name: memberName(target) })
    );
  });

  bot.command("search", async (ctx) => {
    if (!ctx.match.trim() && ctx.chat.type === "private" && ctx.from) {
      await runtime.store.set<Pending>(
        pendingKey(ctx.from.id),
        "search",
        PENDING_SECONDS
      );
      await ctx.reply(t(ctx.locale, "searchPrompt"));
      return;
    }
    await runSearch(ctx, ctx.match);
  });

  const direct = bot.chatType("private");

  direct.command(["start", "menu", "help"], async (ctx) => {
    await runtime.store.delete(pendingKey(ctx.from.id));
    await showMenu(ctx);
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
        : submitUnban(ctx, text));
      return;
    }
    await answerWithAssistant(ctx, text);
  });

  bot.callbackQuery(/^m:(\w+)$/, async (ctx) => {
    const action = ctx.match[1];
    switch (action) {
      case "faq":
        await showFaqTopics(ctx);
        break;
      case "links":
        await showLinks(ctx);
        break;
      case "news":
        await toggleNewsletter(ctx);
        return;
      case "plus":
        await showPlus(ctx);
        break;
      case "search":
        await runtime.store.set<Pending>(
          pendingKey(ctx.from.id),
          "search",
          PENDING_SECONDS
        );
        await ctx.reply(t(ctx.locale, "searchPrompt"));
        break;
      case "unban":
        await startUnban(ctx);
        break;
      default:
        await showMenu(ctx);
    }
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^faq:t:(\w+)$/, async (ctx) => {
    const topic = ctx.match[1] as FaqTopic;
    await (FAQ_TOPICS.includes(topic)
      ? showFaqQuestions(ctx, topic)
      : showFaqTopics(ctx));
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^faq:q:([\w-]+)$/, async (ctx) => {
    await showFaqAnswer(ctx, ctx.match[1] ?? "");
    await ctx.answerCallbackQuery();
  });

  // Buttons from old menus.
  bot.on("callback_query", async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  return bot;
};

export type DroidBot = ReturnType<typeof createBot>;
