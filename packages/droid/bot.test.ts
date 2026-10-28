import { describe, expect, test } from "vitest";
import { notifyMember } from "./bot";
import type { TelegramMember } from "./data";
import {
  type ApiCall,
  BOT_INFO,
  callback,
  createFakeData,
  createTestBot,
  groupText,
  NOW,
  NOW_SECONDS,
  privateText,
  product,
  user,
} from "./testing";

const GROUP = -1001;
const OTHER_GROUP = -1002;

const member = (
  id: number,
  extra: Partial<TelegramMember> = {}
): TelegramMember => ({
  banned_at: null,
  chat_status: "member",
  first_name: `User${id}`,
  id,
  language_code: "ar",
  last_name: null,
  newsletter_opt_in: false,
  username: null,
  ...extra,
});

const moderatedChats = () => [
  { id: GROUP, moderated: true, title: "The Club", username: "theideaiq_club" },
  { id: OTHER_GROUP, moderated: true, title: "Gaming", username: null },
];

interface Keyboard {
  inline_keyboard: {
    callback_data?: string;
    text: string;
    url?: string;
    web_app?: { url: string };
  }[][];
}

const ARABIC_MINI_APP = /\/ar\/tg$/;
const PAYMENT_WORDS = /wayl|pay\b|checkout/i;

const required = <T>(value: T | undefined): T => {
  if (value === undefined) {
    throw new Error("Expected an API call");
  }
  return value;
};

const textOf = (call: ApiCall | undefined) =>
  String(required(call).payload.text);

const buttonsOf = (call: ApiCall | undefined) => {
  const markup = required(call).payload.reply_markup as Keyboard | undefined;
  return markup ? markup.inline_keyboard.flat() : [];
};

describe("private chats", () => {
  test("/start shows the Arabic menu by default and saves the member", async () => {
    const { data, state } = createFakeData();
    const { send, sent } = createTestBot({ data });

    await send(privateText(user(1, { language_code: undefined }), "/start"));

    const [reply] = sent();
    expect(textOf(reply)).toContain("أهلاً User1");
    const [shop, ...menu] = buttonsOf(reply);
    expect(shop?.web_app?.url).toMatch(ARABIC_MINI_APP);
    expect(menu.map((b) => b.callback_data)).toEqual([
      "m:orders",
      "m:bulbs",
      "m:search",
      "m:support",
      "m:plus",
      "m:faq",
      "m:links",
      "m:news",
    ]);
    expect(state.members.get(1)?.first_name).toBe("User1");
  });

  test("speaks English to English Telegram users", async () => {
    const { data } = createFakeData();
    const { send, sent } = createTestBot({ data });
    await send(privateText(user(1, { language_code: "en-GB" }), "/start"));
    expect(textOf(sent()[0])).toContain("Hi User1");
  });

  test("free text gets the menu", async () => {
    const { data } = createFakeData();
    const { send, sent } = createTestBot({ data });
    await send(privateText(user(1), "hello there"));
    expect(buttonsOf(sent()[0]).length).toBeGreaterThan(0);
  });

  test("/search lists sale and rental products with links, no payment links", async () => {
    const { data } = createFakeData({
      products: [
        product(),
        product({
          id: "p2",
          kind: "rental",
          name_ar: "لعبة بلايستيشن للإيجار",
          name_en: "PlayStation game rental",
          slug: "ps-rental",
          stock_count: 0,
        }),
      ],
    });
    const { send, sent } = createTestBot({ data });

    await send(
      privateText(user(1, { language_code: "en" }), "/search playstation")
    );

    const [reply] = sent();
    expect(reply?.payload.parse_mode).toBe("HTML");
    const text = textOf(reply);
    expect(text).toContain("<b>PlayStation 5</b>");
    expect(text).toContain("720,000");
    expect(text).toContain("In stock: 3");
    expect(text).toContain("https://theideaiq.com/store/playstation-5");
    expect(text).toContain("Rent with Plus · Out of stock");
    expect(text).not.toMatch(PAYMENT_WORDS);
  });

  test("search escapes HTML and reports no results", async () => {
    const { data } = createFakeData({
      products: [product({ name_en: "Tom & Jerry <Deluxe>" })],
    });
    const { send, sent } = createTestBot({ data });
    await send(privateText(user(1, { language_code: "en" }), "/search tom"));
    expect(textOf(sent()[0])).toContain("Tom &amp; Jerry &lt;Deluxe&gt;");

    await send(privateText(user(1, { language_code: "en" }), "/search zelda"));
    expect(textOf(sent()[1])).toBe("No products match “zelda”.");
  });

  test("the search button waits for the next message", async () => {
    const { data } = createFakeData({ products: [product()] });
    const { send, sent } = createTestBot({ data });
    await send(callback(user(1), "m:search"));
    expect(textOf(sent()[0])).toContain("اكتب اسم المنتج");
    await send(privateText(user(1), "بلايستيشن"));
    expect(textOf(sent()[1])).toContain("<b>بلايستيشن 5</b>");
  });

  test("FAQ: topics, questions and answers from telegram_faq", async () => {
    const faq = {
      answer_ar: "نوصل إلى كل المحافظات.",
      answer_en: "We deliver to every governorate.",
      id: "8f7d1c1e-0000-4000-8000-000000000001",
      question_ar: "هل توصلون لكل العراق؟",
      question_en: "Do you deliver across Iraq?",
      topic: "store",
    };
    const { data } = createFakeData({ faq: [faq] });
    const { send, sent, calls } = createTestBot({ data });

    await send(callback(user(1, { language_code: "en" }), "m:faq"));
    const [topics] = sent("editMessageText");
    expect(buttonsOf(topics).map((b) => b.callback_data)).toEqual([
      "faq:t:store",
      "m:home",
    ]);

    await send(callback(user(1, { language_code: "en" }), "faq:t:store"));
    expect(
      buttonsOf(sent("editMessageText")[1]).map((b) => b.callback_data)
    ).toEqual([`faq:q:${faq.id}`, "m:faq"]);

    await send(callback(user(1, { language_code: "en" }), `faq:q:${faq.id}`));
    expect(textOf(sent("editMessageText")[2])).toBe(
      "Do you deliver across Iraq?\n\nWe deliver to every governorate."
    );
    expect(
      calls.filter((c) => c.method === "answerCallbackQuery")
    ).toHaveLength(3);
  });

  test("links menu has the website, The Club and the app", async () => {
    const { data } = createFakeData();
    const { send, sent } = createTestBot({
      appUrl: "https://partners.theideaiq.com",
      data,
    });
    await send(callback(user(1), "m:links"));
    expect(
      buttonsOf(sent("editMessageText")[0]).map((b) => b.url ?? b.callback_data)
    ).toEqual([
      "https://theideaiq.com/ar",
      "https://t.me/theideaiq_club",
      "https://partners.theideaiq.com",
      "m:home",
    ]);
  });

  test("orders and Bulbs ask to connect the Pass first", async () => {
    const { data } = createFakeData();
    const { send, sent } = createTestBot({ data });
    await send(privateText(user(1, { language_code: "en" }), "/orders"));
    expect(textOf(sent()[0])).toContain("Connect Telegram to your Pass");
    expect(buttonsOf(sent()[0])[0]?.url).toBe(
      "https://theideaiq.com/pass/settings"
    );
  });

  test("linked members track their latest orders", async () => {
    const { data } = createFakeData({
      links: { 1: "u1" },
      orders: [
        {
          created_at: "2026-10-20T10:00:00Z",
          id: "o2",
          number: 1043,
          status: "shipped",
          total: 725_000,
          user_id: "u1",
        },
        {
          created_at: "2026-10-01T10:00:00Z",
          id: "o1",
          number: 1012,
          status: "delivered",
          total: 50_000,
          user_id: "u1",
        },
        {
          created_at: "2026-10-01T10:00:00Z",
          id: "o9",
          number: 9999,
          status: "paid",
          total: 1,
          user_id: "someone-else",
        },
      ],
    });
    const { send, sent } = createTestBot({ data });
    await send(privateText(user(1, { language_code: "en" }), "/orders"));
    const text = textOf(sent()[0]).replace(/\s/g, " ");
    expect(text).toContain("#1043 · On the way · IQD 725,000");
    expect(text).toContain("#1012 · Delivered · IQD 50,000");
    expect(text).not.toContain("9999");
    expect(buttonsOf(sent()[0])[0]?.url).toBe(
      "https://theideaiq.com/pass/orders"
    );
  });

  test("linked members see their Bulbs", async () => {
    const { data } = createFakeData({
      bulbs: { u1: { available: 120, pending: 35 } },
      links: { 1: "u1" },
    });
    const { send, sent } = createTestBot({ data });
    await send(callback(user(1, { language_code: "en" }), "m:bulbs"));
    const text = textOf(sent("editMessageText")[0]).replace(/\s/g, " ");
    expect(text).toContain("120 Bulbs (worth IQD 12,000)");
    expect(text).toContain("Plus 35 on the way");
  });

  test("Talk to us: a ticket for members, a Telegram request otherwise", async () => {
    const { data, state } = createFakeData({ links: { 1: "u1" } });
    const { send, sent } = createTestBot({ data });

    await send(callback(user(1, { language_code: "en" }), "m:support"));
    expect(textOf(sent()[0])).toContain("Write your message");
    await send(
      privateText(user(1, { language_code: "en" }), "Where is my order?")
    );
    expect(state.tickets).toEqual([
      { message: "Where is my order?", number: 1001, userId: "u1" },
    ]);
    expect(textOf(sent()[1])).toContain("#1001");

    await send(privateText(user(2), "/support My card is broken"));
    expect(state.requests).toEqual([
      { memberId: 2, message: "My card is broken" },
    ]);
  });

  test("newsletter toggles telegram_members.newsletter_opt_in", async () => {
    const { data, state } = createFakeData();
    const { send, calls } = createTestBot({ data });
    await send(callback(user(1), "m:news"));
    expect(state.members.get(1)?.newsletter_opt_in).toBe(true);
    await send(callback(user(1), "m:news"));
    expect(state.members.get(1)?.newsletter_opt_in).toBe(false);
    const answers = calls.filter((c) => c.method === "answerCallbackQuery");
    expect(answers.map((c) => c.payload.text)).toEqual([
      expect.stringContaining("فعّلت"),
      expect.stringContaining("أوقفت"),
    ]);
  });

  test("drops messages older than five minutes", async () => {
    const { data } = createFakeData();
    const { send, calls } = createTestBot({ data });
    await send(privateText(user(1), "/start", NOW_SECONDS - 301));
    expect(calls).toHaveLength(0);
  });
});

describe("inline mode", () => {
  test("shares products in any chat", async () => {
    const { data } = createFakeData({ products: [product()] });
    const { send, sent } = createTestBot({ data });
    await send({
      inline_query: {
        chat_type: "supergroup",
        from: user(1, { language_code: "en" }),
        id: "q1",
        offset: "",
        query: "playstation",
      },
    });
    const [answer] = sent("answerInlineQuery");
    const results = required(answer).payload.results as {
      title: string;
      url: string;
    }[];
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: "PlayStation 5",
      url: "https://theideaiq.com/store/playstation-5",
    });
  });
});

describe("groups", () => {
  test("records membership changes without moderating", async () => {
    const { data, state } = createFakeData({ chats: moderatedChats() });
    const { send, sent } = createTestBot({ data });
    const change = (oldStatus: string, newStatus: string) => ({
      chat_member: {
        chat: { id: GROUP, title: "The Club", type: "supergroup" as const },
        date: NOW_SECONDS,
        from: user(50),
        new_chat_member: { status: newStatus, user: user(7) },
        old_chat_member: { status: oldStatus, user: user(7) },
      } as never,
    });

    await send(change("left", "member"));
    expect(state.members.get(7)?.chat_status).toBe("member");
    await send(change("member", "kicked"));
    expect(state.members.get(7)?.banned_at).toBe(new Date(NOW).toISOString());
    await send(change("kicked", "left"));
    expect(state.members.get(7)?.banned_at).toBeNull();
    // No welcomes, bans or deletions: Telegram's own tools do that.
    expect(sent()).toHaveLength(0);
    expect(sent("banChatMember")).toHaveLength(0);
  });

  test("leaves group messages alone", async () => {
    const { data } = createFakeData({ chats: moderatedChats() });
    const { calls, send } = createTestBot({ data });
    await send(groupText(GROUP, user(3), "buy crypto now, guaranteed profit"));
    expect(calls).toHaveLength(0);
  });

  test("registers a chat when the bot becomes admin", async () => {
    const { data, state } = createFakeData();
    const { send } = createTestBot({ data });
    await send({
      my_chat_member: {
        chat: {
          id: -2000,
          title: "New group",
          type: "supergroup",
          username: "newgroup",
        },
        date: NOW_SECONDS,
        from: user(50),
        new_chat_member: { status: "administrator", user: BOT_INFO },
        old_chat_member: { status: "member", user: BOT_INFO },
      } as never,
    });
    expect(state.chats).toEqual([
      { id: -2000, moderated: true, title: "New group", username: "newgroup" },
    ]);
  });
});

describe("channel newsletter", () => {
  test("sends new posts to subscribers and stops for those who blocked the bot", async () => {
    const { data, state } = createFakeData({
      chats: [
        {
          id: -3000,
          moderated: true,
          title: "The IDEA",
          username: "theideaiq",
        },
      ],
      members: [
        member(1, { language_code: "en", newsletter_opt_in: true }),
        member(2, { newsletter_opt_in: true }),
        member(3, { newsletter_opt_in: false }),
        member(4, {
          banned_at: "2026-01-01T00:00:00Z",
          newsletter_opt_in: true,
        }),
      ],
    });
    const { send, sent } = createTestBot(
      { data },
      {
        sendMessage: (payload) =>
          payload.chat_id === 2
            ? {
                error: {
                  code: 403,
                  description: "Forbidden: bot was blocked by the user",
                },
              }
            : {
                chat: { id: payload.chat_id, type: "private" },
                date: NOW_SECONDS,
                message_id: 1,
              },
      }
    );
    const post = {
      channel_post: {
        chat: {
          id: -3000,
          title: "The IDEA",
          type: "channel" as const,
          username: "theideaiq",
        },
        date: NOW_SECONDS,
        message_id: 42,
        text: "News",
      },
    };
    await send(post);
    await send(post);

    const messages = sent();
    expect(messages.map((c) => c.payload.chat_id)).toEqual([1, 2]);
    expect(textOf(messages[0])).toBe("New post in The IDEA:");
    expect(buttonsOf(messages[0])[0]?.url).toBe("https://t.me/theideaiq/42");
    expect(state.members.get(2)?.newsletter_opt_in).toBe(false);
  });
});

describe("The Club's join requests", () => {
  const request = (chatId: number, from: ReturnType<typeof user>) => ({
    chat_join_request: {
      chat: { id: chatId, title: "Plus room", type: "supergroup" as const },
      date: NOW_SECONDS,
      from,
      user_chat_id: from.id,
    } as never,
  });

  test("approves requests that pass the chat's rule", async () => {
    const { data } = createFakeData({
      joins: {
        "-500:1": { allowed: true, linked: true, rule: "plus" },
      },
    });
    const { send, sent } = createTestBot({ data });
    await send(request(-500, user(1)));
    expect(sent("approveChatJoinRequest")[0]?.payload).toMatchObject({
      chat_id: -500,
      user_id: 1,
    });
    expect(sent()).toHaveLength(0);
  });

  test("declines the rest and says how to get in", async () => {
    const { data } = createFakeData({
      joins: {
        "-500:1": { allowed: false, linked: true, rule: "plus" },
        "-500:2": { allowed: false, linked: false, rule: "pass" },
      },
    });
    const { send, sent } = createTestBot({ data });

    await send(request(-500, user(1, { language_code: "en" })));
    expect(sent("declineChatJoinRequest")).toHaveLength(1);
    expect(textOf(sent()[0])).toContain("Plus room is for Plus members");
    expect(buttonsOf(sent()[0])[0]?.url).toBe("https://theideaiq.com/plus");

    await send(request(-500, user(2, { language_code: "en" })));
    expect(textOf(sent()[1])).toContain("connect Telegram to your Pass");
    expect(buttonsOf(sent()[1])[0]?.url).toBe(
      "https://theideaiq.com/pass/settings"
    );
  });

  test("leaves chats without a rule to their admins", async () => {
    const { data } = createFakeData();
    const { calls, send } = createTestBot({ data });
    await send(request(-600, user(3)));
    expect(calls).toHaveLength(0);
  });
});

describe("notifications on Telegram", () => {
  test("sends the title, text and a button, and reports a blocked bot", async () => {
    const { data } = createFakeData();
    const { bot, sent } = createTestBot({ data });
    expect(
      await notifyMember(bot.api, {
        body: "Open it to see the details.",
        locale: "en",
        telegramId: 42,
        title: "Your order is on its way",
        url: "https://theideaiq.com/pass/orders/o1",
      })
    ).toBe(true);
    expect(textOf(sent()[0])).toBe(
      "<b>Your order is on its way</b>\nOpen it to see the details."
    );
    expect(buttonsOf(sent()[0])[0]).toMatchObject({
      text: "Open",
      url: "https://theideaiq.com/pass/orders/o1",
    });

    const blocked = createTestBot(
      { data },
      {
        sendMessage: () => ({
          error: { code: 403, description: "Forbidden: bot was blocked" },
        }),
      }
    );
    expect(
      await notifyMember(blocked.bot.api, {
        body: "x",
        locale: "ar",
        telegramId: 42,
        title: "y",
        url: "https://theideaiq.com",
      })
    ).toBe(false);
  });
});
