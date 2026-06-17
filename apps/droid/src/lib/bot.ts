import type { Content } from '@google/genai';
import { droidEnv as env } from '@repo/env/droid';
import { Bot, type Context, type SessionFlavor, session } from 'grammy';
import { generateResponse } from './gemini';
import { redis } from './redis';
import { UpstashAdapter } from './storage';

interface SessionData {
  /** Chat history for context-aware AI responses */
  history: Content[];
}

export type MyContext = Context & SessionFlavor<SessionData>;

/**
 * The main Bot instance.
 * Uses Webhooks for both development (via ngrok) and production (configured in API route).
 */
export const bot = new Bot<MyContext>(env.TELEGRAM_BOT_TOKEN);

function getSessionKey(ctx: Context): string | undefined {
  return ctx.from && ctx.chat ? `${ctx.chat.id}:${ctx.from.id}` : undefined;
}

// Session middleware
// Stores session data (conversation history) in Upstash Redis to be stateless/serverless friendly.
bot.use(
  session({
    initial: (): SessionData => ({ history: [] }),
    storage: new UpstashAdapter<SessionData>(redis),
    getSessionKey,
  }),
);

// Group Logic: Welcome
bot.on('message:new_chat_members', async (ctx) => {
  await ctx.reply('Welcome to The IDEA Community!');
});

// Main Message Handler
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  const chatType = ctx.chat.type;

  // Group Logic: Spam Protection
  // Basic keyword filtering for crypto/spam bots in public groups.
  if (chatType === 'group' || chatType === 'supergroup') {
    const lower = text.toLowerCase();
    const spamKeywords = [
      'crypto',
      'bitcoin',
      'btc',
      'invest',
      'forex',
      'profit',
      'binance',
    ];

    if (spamKeywords.some((w) => lower.includes(w))) {
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // biome-ignore lint/suspicious/noConsole: logging errors is fine
        console.error('Failed to delete spam message:', e);
      }
    }
    return;
  }

  // Private Logic: AI Agent
  // Interacts with Gemini to provide helpful responses.
  if (chatType === 'private') {
    await ctx.replyWithChatAction('typing');

    const history = ctx.session.history || [];

    const reply = await generateResponse(history, text);

    await ctx.reply(reply);

    // Update history
    const newHistory = [
      ...history,
      { role: 'user', parts: [{ text }] },
      { role: 'model', parts: [{ text: reply }] },
    ];

    // Limit to last 20 messages to manage context window and storage
    ctx.session.history = newHistory.slice(-20) as Content[];
  }
});
