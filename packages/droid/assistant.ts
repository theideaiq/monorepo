/**
 * The AI assistant for private chats. It answers questions about The IDEA and
 * looks products up in the real catalog; it never quotes prices it didn't
 * get from the catalog, takes orders or makes payment links.
 */
import { generateText, isStepCount, type LanguageModel, tool } from "ai";
import { z } from "zod";
import type { DroidData } from "./data";
import { type BotLocale, t } from "./i18n";
import { summarizeProduct } from "./products";
import type { KeyValueStore } from "./store";

export interface ChatTurn {
  content: string;
  role: "assistant" | "user";
}

export const HISTORY_TTL_SECONDS = 60 * 60 * 24;
export const HISTORY_MAX_TURNS = 20;
export const HISTORY_MAX_CHARACTERS = 8000;
/** Telegram rejects longer messages. */
const MAX_REPLY_CHARACTERS = 4000;
const SEARCH_LIMIT = 5;

export const historyKey = (userId: number) => `ai:${userId}`;

/** The most recent turns that fit the turn and character caps. */
export const trimHistory = (turns: ChatTurn[]): ChatTurn[] => {
  const kept: ChatTurn[] = [];
  let characters = 0;
  for (const turn of [...turns].reverse()) {
    characters += turn.content.length;
    if (kept.length >= HISTORY_MAX_TURNS || characters > HISTORY_MAX_CHARACTERS) {
      break;
    }
    kept.unshift(turn);
  }
  // A conversation sent to the model starts with the user.
  while (kept[0]?.role === "assistant") {
    kept.shift();
  }
  return kept;
};

export const systemPrompt = ({
  appUrl,
  locale,
  siteUrl,
}: {
  appUrl?: string;
  locale: BotLocale;
  siteUrl: string;
}) =>
  [
    "You are Droid, the assistant of The IDEA (theideaiq.com), an Iraqi digital ecosystem from The IDEA IQ Inc. in Baghdad, on Telegram.",
    "The IDEA offers:",
    "- Megastore: gaming, tech, books and lifestyle products, delivered to all 19 governorates of Iraq, paid online through Wayl.",
    "- IDEA Plus: a monthly membership to rent games, books and movies; items are delivered and picked up, and each plan has a number of rental slots (items at once).",
    "- Academy: courses and cultural-exchange programs (enquiries through the contact page).",
    "- IDEA Suite: procurement and recruitment services for companies, with business plans.",
    "- The Club: community rooms on Telegram (https://t.me/theideaclub).",
    "- Editorial: news, events with RSVPs, a journal and member submissions.",
    `Website: ${siteUrl}. Store: ${siteUrl}/${locale}/store. IDEA Plus: ${siteUrl}/${locale}/plus.${appUrl ? ` App: ${appUrl}.` : ""} Support email: hi@theideaiq.com.`,
    "Rules:",
    "- For any question about products, availability, prices or stock, call search_products and only state what it returns. Never guess or invent prices, stock, discounts, delivery times or links.",
    "- You cannot take orders, reserve items, process payments or create payment links. To buy, send people to the product page; for orders, accounts and refunds, to hi@theideaiq.com.",
    "- If you don't know something, say so and point to the website or support email.",
    "- Keep answers short and friendly. Write plain text without Markdown: Telegram shows it as is.",
    "- Stay on topics related to The IDEA; politely decline anything else.",
    t(locale, "aiSystemLocale"),
  ].join("\n");

export interface AssistantRequest {
  appUrl?: string;
  data: DroidData;
  locale: BotLocale;
  model: LanguageModel;
  siteUrl: string;
  store: KeyValueStore;
  text: string;
  userId: number;
}

/** Answers one message, keeping the conversation in the store. */
export const askAssistant = async ({
  appUrl,
  data,
  locale,
  model,
  siteUrl,
  store,
  text,
  userId,
}: AssistantRequest): Promise<string> => {
  const key = historyKey(userId);
  const history = (await store.get<ChatTurn[]>(key)) ?? [];
  const conversation = trimHistory([...history, { content: text, role: "user" }]);

  const result = await generateText({
    maxOutputTokens: 800,
    messages: conversation,
    model,
    stopWhen: isStepCount(4),
    system: systemPrompt({ appUrl, locale, siteUrl }),
    tools: {
      search_products: tool({
        description:
          "Search The IDEA's store and IDEA Plus rental catalog by product name. Returns name, price (null for rentals), stock and the product page URL.",
        execute: async ({ query }) => {
          const products = await data.searchProducts(query, SEARCH_LIMIT);
          return products.map((product) =>
            summarizeProduct(product, locale, siteUrl)
          );
        },
        inputSchema: z.object({
          query: z
            .string()
            .min(1)
            .max(100)
            .describe("Product name or keyword, e.g. PlayStation 5 or Dune"),
        }),
      }),
    },
  });

  const reply = result.text.trim().slice(0, MAX_REPLY_CHARACTERS);
  if (!reply) {
    throw new Error("The model returned an empty reply.");
  }

  await store.set(
    key,
    trimHistory([...conversation, { content: reply, role: "assistant" }]),
    HISTORY_TTL_SECONDS
  );
  return reply;
};
