import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, test } from "vitest";
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
  { id: GROUP, moderated: true, title: "The Club", username: "theideaclub" },
  { id: OTHER_GROUP, moderated: true, title: "Gaming", username: null },
];

const adminsResponder =
  (
    adminIds: number[],
    bot: Record<string, unknown> = {
      can_delete_messages: true,
      can_restrict_members: true,
    }
  ) =>
  () => [
    {
      status: "administrator",
      user: BOT_INFO,
      ...bot,
    },
    ...adminIds.map((id) => ({ status: "creator", user: user(id) })),
  ];

interface Keyboard {
  inline_keyboard: { callback_data?: string; text: string; url?: string }[][];
}

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
    expect(buttonsOf(reply).map((b) => b.callback_data)).toEqual([
      "m:search",
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

  test("offers an unban request only to banned members", async () => {
    const { data } = createFakeData({
      members: [member(1, { banned_at: new Date(NOW).toISOString() })],
    });
    const { send, sent } = createTestBot({ data });
    await send(privateText(user(1), "/start"));
    expect(buttonsOf(sent()[0]).map((b) => b.callback_data)).toContain(
      "m:unban"
    );
  });

  test("without an AI model, free text gets the menu", async () => {
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
    expect(text).toContain("https://theideaiq.com/en/store/playstation-5");
    expect(text).toContain("Rent with IDEA Plus · Out of stock");
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
      appUrl: "https://app.theideaiq.com",
      data,
    });
    await send(callback(user(1), "m:links"));
    expect(
      buttonsOf(sent("editMessageText")[0]).map((b) => b.url ?? b.callback_data)
    ).toEqual([
      "https://theideaiq.com/ar",
      "https://t.me/theideaclub",
      "https://app.theideaiq.com",
      "m:home",
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

  test("unban requests: only when banned, once at a time", async () => {
    const { data, state } = createFakeData({
      members: [
        member(1, { banned_at: new Date(NOW).toISOString() }),
        member(2),
      ],
    });
    const { send, sent } = createTestBot({ data });

    await send(callback(user(2), "m:unban"));
    expect(textOf(sent()[0])).toBe("حسابك غير محظور في مجموعاتنا.");

    await send(callback(user(1), "m:unban"));
    await send(privateText(user(1), "I'm sorry, it was a mistake"));
    expect(state.requests).toEqual([
      {
        memberId: 1,
        message: "I'm sorry, it was a mistake",
        status: "open",
        type: "unban",
      },
    ]);

    await send(callback(user(1), "m:unban"));
    expect(textOf(sent().at(-1))).toContain("قيد المراجعة");
    expect(state.requests).toHaveLength(1);
  });

  test("drops messages older than five minutes", async () => {
    const { data } = createFakeData();
    const { send, calls } = createTestBot({ data });
    await send(privateText(user(1), "/start", NOW_SECONDS - 301));
    expect(calls).toHaveLength(0);
  });
});

describe("AI assistant", () => {
  const usage = {
    inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 10, total: 10 },
    outputTokens: { reasoning: 0, text: 5, total: 5 },
  };

  test("answers private messages with catalog data and keeps history", async () => {
    const { data } = createFakeData({ products: [product()] });
    const model = new MockLanguageModelV4({
      doGenerate: [
        {
          content: [
            {
              input: JSON.stringify({ query: "PlayStation" }),
              toolCallId: "call-1",
              toolName: "search_products",
              type: "tool-call",
            },
          ],
          finishReason: { raw: "tool_calls", unified: "tool-calls" },
          usage,
          warnings: [],
        },
        {
          content: [{ text: "PlayStation 5 costs IQD 720,000.", type: "text" }],
          finishReason: { raw: "stop", unified: "stop" },
          usage,
          warnings: [],
        },
      ],
    });
    const { send, sent, store } = createTestBot({ data, model });

    await send(
      privateText(user(1, { language_code: "en" }), "How much is a PS5?")
    );

    expect(textOf(sent()[0])).toBe("PlayStation 5 costs IQD 720,000.");
    // The tool result reached the model.
    const secondCall = JSON.stringify(model.doGenerateCalls[1]?.prompt);
    expect(secondCall).toContain(
      "https://theideaiq.com/en/store/playstation-5"
    );
    // The system prompt forbids made-up prices and payment links.
    const system = JSON.stringify(model.doGenerateCalls[0]?.prompt);
    expect(system).toContain("Never guess or invent prices");
    expect(system).toContain("payment links");

    expect(await store.get("ai:1")).toEqual([
      { content: "How much is a PS5?", role: "user" },
      { content: "PlayStation 5 costs IQD 720,000.", role: "assistant" },
    ]);
  });

  test("falls back to an apology and the menu when the model fails", async () => {
    const { data } = createFakeData();
    const model = new MockLanguageModelV4({
      doGenerate: () => Promise.reject(new Error("quota")),
    });
    const { send, sent } = createTestBot({ data, model });
    await send(privateText(user(1), "مرحبا"));
    const reply = sent().at(-1);
    expect(textOf(reply)).toContain("عذراً");
    expect(buttonsOf(reply).length).toBeGreaterThan(0);
  });
});

describe("group moderation", () => {
  test("deletes banned words when the bot can delete", async () => {
    const { data } = createFakeData({ chats: moderatedChats() });
    const { send, calls } = createTestBot(
      { data },
      { getChatAdministrators: adminsResponder([50]) }
    );
    await send(groupText(GROUP, user(1), "يا گواد"));
    const deletion = calls.find((c) => c.method === "deleteMessages");
    expect(deletion?.payload.chat_id).toBe(GROUP);
  });

  test("deletes investment spam", async () => {
    const { data } = createFakeData({ chats: moderatedChats() });
    const { send, calls } = createTestBot(
      { data },
      { getChatAdministrators: adminsResponder([50]) }
    );
    await send(
      groupText(GROUP, user(1), "Earn $500 daily trading crypto, DM me now")
    );
    expect(calls.some((c) => c.method === "deleteMessages")).toBe(true);
  });

  test("leaves clean messages, admins and unmoderated chats alone", async () => {
    const { data } = createFakeData({
      chats: [
        ...moderatedChats(),
        { id: -1003, moderated: false, title: "Staff", username: null },
      ],
    });
    const { send, calls } = createTestBot(
      { data },
      { getChatAdministrators: adminsResponder([50]) }
    );
    await send(groupText(GROUP, user(1), "هناك كتاب جديد في المتجر"));
    await send(groupText(GROUP, user(50), "slut"));
    await send(groupText(-1003, user(1), "slut"));
    expect(calls.some((c) => c.method === "deleteMessages")).toBe(false);
  });

  test("doesn't try to delete without the right", async () => {
    const { data } = createFakeData({ chats: moderatedChats() });
    const { send, calls } = createTestBot(
      { data },
      {
        getChatAdministrators: adminsResponder([50], {
          can_delete_messages: false,
          can_restrict_members: false,
        }),
      }
    );
    await send(groupText(GROUP, user(1), "slut"));
    expect(calls.some((c) => c.method === "deleteMessages")).toBe(false);
  });

  test("re-checks edited messages", async () => {
    const { data } = createFakeData({ chats: moderatedChats() });
    const { send, calls } = createTestBot(
      { data },
      { getChatAdministrators: adminsResponder([]) }
    );
    await send({
      edited_message: {
        chat: { id: GROUP, title: "The Club", type: "supergroup" },
        date: NOW_SECONDS - 3600,
        edit_date: NOW_SECONDS,
        from: user(1),
        message_id: 77,
        text: "now it says s.l.u.t",
      },
    });
    expect(
      calls.find((c) => c.method === "deleteMessages")?.payload.message_ids
    ).toEqual([77]);
  });

  test("mutes after more than three identical messages", async () => {
    const { data } = createFakeData({ chats: moderatedChats() });
    const { send, calls, sent } = createTestBot(
      { data },
      { getChatAdministrators: adminsResponder([]) }
    );
    for (const _ of [1, 2, 3, 4]) {
      // biome-ignore lint/performance/noAwaitInLoops: messages arrive in order
      await send(groupText(GROUP, user(1), "join my channel"));
    }
    const deletion = calls.find((c) => c.method === "deleteMessages");
    expect(deletion?.payload.message_ids).toHaveLength(4);
    const restriction = calls.find((c) => c.method === "restrictChatMember");
    expect(restriction?.payload.user_id).toBe(1);
    expect(restriction?.payload.until_date).toBe(NOW_SECONDS + 300);
    expect(textOf(sent().at(-1))).toContain("خمس دقائق");
  });

  test("welcomes new members and syncs chat_member", async () => {
    const { data, state } = createFakeData({
      chats: moderatedChats(),
      members: [member(7, { banned_at: "2026-01-01T00:00:00Z" })],
    });
    const { send, sent } = createTestBot({ data });
    const change = (oldStatus: string, newStatus: string) => ({
      chat_member: {
        chat: { id: GROUP, title: "The Club", type: "supergroup" as const },
        date: NOW_SECONDS,
        from: user(50),
        new_chat_member: {
          status: newStatus,
          user: user(7, { language_code: "en" }),
        },
        old_chat_member: {
          status: oldStatus,
          user: user(7, { language_code: "en" }),
        },
      } as never,
    });

    // Banned elsewhere in the network: joining gets them banned here too.
    await send(change("left", "member"));
    expect(state.members.get(7)?.banned_at).toBe("2026-01-01T00:00:00Z");
    expect(state.members.get(7)?.chat_status).toBe("kicked");
    expect(sent("banChatMember")[0]?.payload).toMatchObject({
      chat_id: GROUP,
      user_id: 7,
    });
    expect(sent()).toHaveLength(0);

    // An admin lifts the ban in Telegram, then they can join.
    await send(change("kicked", "left"));
    expect(state.members.get(7)?.banned_at).toBeNull();
    await send(change("left", "member"));
    expect(state.members.get(7)?.chat_status).toBe("member");
    expect(textOf(sent()[0])).toBe(
      "Welcome to The Club, User7! Please be respectful and follow the group rules."
    );

    await send(change("member", "kicked"));
    expect(state.members.get(7)?.banned_at).toBe(new Date(NOW).toISOString());
    expect(state.members.get(7)?.chat_status).toBe("kicked");
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

describe("/ban", () => {
  const statusResponder =
    (statuses: Record<number, string>) =>
    (payload: Record<string, unknown>) => ({
      status: statuses[payload.user_id as number] ?? "member",
      user: user(payload.user_id as number),
    });

  test("admins ban by reply across every moderated chat", async () => {
    const { data, state } = createFakeData({ chats: moderatedChats() });
    const { send, calls, sent } = createTestBot(
      { data },
      {
        getChatAdministrators: adminsResponder([50]),
        getChatMember: statusResponder({ 50: "creator" }),
      }
    );
    await send(
      groupText(GROUP, user(50, { language_code: "en" }), "/ban", {
        reply_to_message: {
          chat: { id: GROUP, title: "The Club", type: "supergroup" },
          date: NOW_SECONDS,
          from: user(8, { username: "spammer" }),
          message_id: 900,
          text: "spam",
        },
      })
    );
    const bans = calls.filter((c) => c.method === "banChatMember");
    expect(bans.map((c) => c.payload.chat_id).sort()).toEqual(
      [OTHER_GROUP, GROUP].sort()
    );
    expect(state.members.get(8)?.banned_at).not.toBeNull();
    expect(textOf(sent().at(-1))).toBe(
      "@spammer has been banned from 2 group(s)."
    );
  });

  test("admins ban by @username", async () => {
    const { data } = createFakeData({
      chats: moderatedChats(),
      members: [member(9, { username: "Troll" })],
    });
    const { send, calls } = createTestBot(
      { data },
      {
        getChatAdministrators: adminsResponder([50]),
        getChatMember: statusResponder({ 50: "administrator" }),
      }
    );
    await send(groupText(GROUP, user(50), "/ban @troll"));
    expect(
      calls
        .filter((c) => c.method === "banChatMember")
        .map((c) => c.payload.user_id)
    ).toEqual([9, 9]);
  });

  test("non-admins can't ban, and admins can't be banned", async () => {
    const { data } = createFakeData({
      chats: moderatedChats(),
      members: [member(51, { username: "othermod" })],
    });
    const { send, calls, sent } = createTestBot(
      { data },
      {
        getChatAdministrators: adminsResponder([50, 51]),
        getChatMember: statusResponder({
          50: "administrator",
          51: "administrator",
        }),
      }
    );
    await send(groupText(GROUP, user(1), "/ban @othermod"));
    expect(textOf(sent().at(-1))).toBe("هذا الأمر للمشرفين فقط.");
    await send(groupText(GROUP, user(50), "/ban @othermod"));
    expect(textOf(sent().at(-1))).toBe("لا يمكن حظر مشرف.");
    await send(groupText(GROUP, user(50), "/ban @nobody"));
    expect(textOf(sent().at(-1))).toContain("لم أجد");
    expect(calls.some((c) => c.method === "banChatMember")).toBe(false);
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
