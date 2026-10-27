/**
 * Offline fakes for the bot's tests: an in-memory `DroidData` and a Telegram
 * transport that records API calls instead of sending them.
 */
import type { ProductCard } from "@repo/commerce/catalog";
import type { Update, UserFromGetMe } from "grammy/types";
import { createBot, type DroidOptions } from "./bot";
import type {
  BulbBalance,
  DroidData,
  FaqEntry,
  JoinCheck,
  OrderSummary,
  TelegramChat,
  TelegramMember,
} from "./data";
import { createMemoryStore } from "./store";

export const BOT_INFO = {
  can_connect_to_business: false,
  can_join_groups: true,
  can_read_all_group_messages: true,
  first_name: "Droid",
  has_main_web_app: false,
  id: 999,
  is_bot: true,
  supports_inline_queries: false,
  username: "theideaiq_bot",
} as UserFromGetMe;

export const NOW = 1_800_000_000_000;
export const NOW_SECONDS = NOW / 1000;

let lastId = 0;
/** Unique ids for messages and callback queries. */
const nextId = () => {
  lastId += 1;
  return lastId;
};

export interface FakeDataState {
  bulbs: Map<string, BulbBalance>;
  chats: TelegramChat[];
  faq: FaqEntry[];
  /** "chatId:memberId" → the join check. */
  joins: Map<string, JoinCheck>;
  /** Telegram id → The IDEA Pass member. */
  links: Map<number, string>;
  members: Map<number, TelegramMember>;
  orders: (OrderSummary & { user_id: string })[];
  products: ProductCard[];
  requests: { memberId: number; message: string }[];
  tickets: { message: string; number: number; userId: string }[];
}

export const createFakeData = (
  initial: Partial<
    Omit<FakeDataState, "bulbs" | "joins" | "links" | "members">
  > & {
    bulbs?: Record<string, BulbBalance>;
    joins?: Record<string, JoinCheck>;
    links?: Record<number, string>;
    members?: TelegramMember[];
  } = {}
) => {
  const state: FakeDataState = {
    bulbs: new Map(Object.entries(initial.bulbs ?? {})),
    chats: initial.chats ?? [],
    faq: initial.faq ?? [],
    joins: new Map(Object.entries(initial.joins ?? {})),
    links: new Map(
      Object.entries(initial.links ?? {}).map(([id, owner]) => [
        Number(id),
        owner,
      ])
    ),
    members: new Map((initial.members ?? []).map((m) => [m.id, m])),
    orders: initial.orders ?? [],
    products: initial.products ?? [],
    requests: initial.requests ?? [],
    tickets: initial.tickets ?? [],
  };

  const blankMember = (id: number): TelegramMember => ({
    banned_at: null,
    chat_status: null,
    first_name: null,
    id,
    language_code: null,
    last_name: null,
    newsletter_opt_in: false,
    username: null,
  });

  const bannedAt = (current: string | null, banned: boolean | undefined) => {
    if (banned === undefined) {
      return current;
    }
    return banned ? new Date(NOW).toISOString() : null;
  };

  const data: DroidData = {
    createRequest: (memberId, message) => {
      state.requests.push({ memberId, message });
      return Promise.resolve();
    },
    createTicket: (userId, message) => {
      const number = 1001 + state.tickets.length;
      state.tickets.push({ message, number, userId });
      return Promise.resolve(number);
    },
    getBulbs: (userId) =>
      Promise.resolve(state.bulbs.get(userId) ?? { available: 0, pending: 0 }),
    getChat: (chatId) =>
      Promise.resolve(state.chats.find((c) => c.id === chatId) ?? null),
    getFaq: (id) => Promise.resolve(state.faq.find((f) => f.id === id) ?? null),
    getLinkedUser: (memberId) =>
      Promise.resolve(state.links.get(memberId) ?? null),
    getMember: (id) => Promise.resolve(state.members.get(id) ?? null),
    joinCheck: (chatId, memberId) =>
      Promise.resolve(state.joins.get(`${chatId}:${memberId}`) ?? null),
    listFaq: (topic) =>
      Promise.resolve(
        state.faq.filter((entry) => !topic || entry.topic === topic)
      ),
    listNewsletterMembers: (offset, limit) =>
      Promise.resolve(
        [...state.members.values()]
          .filter((m) => m.newsletter_opt_in && !m.banned_at)
          .slice(offset, offset + limit)
          .map(({ id, language_code }) => ({ id, language_code }))
      ),
    listOrders: (userId, limit) =>
      Promise.resolve(
        state.orders
          .filter((order) => order.user_id === userId)
          .slice(0, limit)
          .map(({ user_id: _owner, ...order }) => order)
      ),
    saveChat: (chat) => {
      const existing = state.chats.find((c) => c.id === chat.id);
      if (existing) {
        Object.assign(existing, chat);
      } else {
        state.chats.push({ ...chat, moderated: true });
      }
      return Promise.resolve();
    },
    searchProducts: (query, limit) =>
      Promise.resolve(
        state.products
          .filter((p) =>
            `${p.name_ar} ${p.name_en}`
              .toLowerCase()
              .includes(query.toLowerCase())
          )
          .slice(0, limit)
      ),
    setMemberStatus: (member, status, banned) => {
      const current = state.members.get(member.id) ?? blankMember(member.id);
      state.members.set(member.id, {
        ...current,
        ...member,
        banned_at: bannedAt(current.banned_at, banned),
        chat_status: status,
      });
      return Promise.resolve();
    },
    setNewsletter: (memberId, optIn) => {
      const current = state.members.get(memberId) ?? blankMember(memberId);
      state.members.set(memberId, { ...current, newsletter_opt_in: optIn });
      return Promise.resolve();
    },
    upsertMember: (member) => {
      const current = state.members.get(member.id) ?? blankMember(member.id);
      state.members.set(member.id, { ...current, ...member });
      return Promise.resolve();
    },
  };

  return { data, state };
};

export interface ApiCall {
  method: string;
  payload: Record<string, unknown>;
}

type Responder = (
  payload: Record<string, unknown>
) => unknown | { error: { code: number; description: string } };

export const createTestBot = (
  options: Partial<DroidOptions> & { data: DroidData },
  responders: Record<string, Responder> = {}
) => {
  const store = options.store ?? createMemoryStore(() => NOW);
  const bot = createBot({
    botInfo: BOT_INFO,
    logger: { error: () => undefined, info: () => undefined },
    now: () => NOW,
    store,
    token: "123:test",
    ...options,
  });
  const calls: ApiCall[] = [];
  const defaultResult = (method: string, body: Record<string, unknown>) =>
    method === "sendMessage" || method === "editMessageText"
      ? {
          chat: { id: body.chat_id, type: "private" },
          date: NOW_SECONDS,
          message_id: nextId(),
          text: body.text,
        }
      : true;

  bot.api.config.use((_previous, method, payload) => {
    const body = (payload ?? {}) as Record<string, unknown>;
    calls.push({ method, payload: body });
    const responder = responders[method];
    const result = responder ? responder(body) : defaultResult(method, body);
    if (result && typeof result === "object" && "error" in result) {
      const { code, description } = (
        result as { error: { code: number; description: string } }
      ).error;
      return Promise.resolve({
        description,
        error_code: code,
        ok: false,
      } as never);
    }
    return Promise.resolve({ ok: true, result } as never);
  });

  const send = (update: Omit<Update, "update_id">) =>
    bot.handleUpdate({ update_id: Math.floor(Math.random() * 1e9), ...update });

  const sent = (method = "sendMessage") =>
    calls.filter((call) => call.method === method);

  return { bot, calls, send, sent, store };
};

// ── Update builders ──────────────────────────────────────────────────────────

export const user = (id: number, extra: Record<string, unknown> = {}) => ({
  first_name: `User${id}`,
  id,
  is_bot: false,
  language_code: "ar",
  ...extra,
});

export const privateText = (
  from: ReturnType<typeof user>,
  text: string,
  date = NOW_SECONDS
): Omit<Update, "update_id"> => ({
  message: {
    chat: { first_name: from.first_name, id: from.id, type: "private" },
    date,
    from,
    message_id: nextId(),
    text,
    ...(text.startsWith("/")
      ? {
          entities: [
            {
              length: text.split(" ")[0]?.length ?? 0,
              offset: 0,
              type: "bot_command" as const,
            },
          ],
        }
      : {}),
  },
});

export const groupText = (
  chatId: number,
  from: ReturnType<typeof user>,
  text: string,
  extra: Record<string, unknown> = {}
): Omit<Update, "update_id"> => ({
  message: {
    chat: { id: chatId, title: "The Club", type: "supergroup" },
    date: NOW_SECONDS,
    from,
    message_id: nextId(),
    text,
    ...(text.startsWith("/")
      ? {
          entities: [
            {
              length: text.split(" ")[0]?.length ?? 0,
              offset: 0,
              type: "bot_command" as const,
            },
          ],
        }
      : {}),
    ...extra,
  } as never,
});

export const callback = (
  from: ReturnType<typeof user>,
  data: string
): Omit<Update, "update_id"> => ({
  callback_query: {
    chat_instance: "1",
    data,
    from,
    id: String(nextId()),
    message: {
      chat: { first_name: from.first_name, id: from.id, type: "private" },
      date: NOW_SECONDS - 3600,
      from: BOT_INFO,
      message_id: nextId(),
      text: "menu",
    },
  },
});

export const product = (extra: Partial<ProductCard> = {}): ProductCard => ({
  category_id: null,
  compare_at_price: null,
  condition: "new",
  currency: "IQD",
  featured: false,
  id: "p1",
  images: [],
  kind: "sale",
  name_ar: "بلايستيشن 5",
  name_en: "PlayStation 5",
  price: 720_000,
  rentable: false,
  slug: "playstation-5",
  stock_count: 3,
  variants: [],
  ...extra,
});
