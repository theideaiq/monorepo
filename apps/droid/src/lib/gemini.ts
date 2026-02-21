import { type Content, GoogleGenAI, type Tool } from '@google/genai';
import { droidEnv as env } from '@repo/env/droid';
import { PaymentFactory } from '@repo/payment-engine';
import { supabase } from './supabase';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const MAX_PRODUCT_SEARCH_RESULTS = 5;

// --- Tool Definitions ---

interface SearchProductsFunctionDeclaration {
  name: string;
  description: string;
  parametersJsonSchema: {
    type: 'object';
    properties: {
      query: {
        type: 'string';
        description: string;
      };
    };
    required: ['query'];
  };
}

const searchProductsTool: SearchProductsFunctionDeclaration = {
  name: 'search_products',
  description:
    'Search for products in the catalog by name. Use this when the user asks about product availability, price, or description.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          "The product name or keyword to search for (e.g. 'PlayStation', 'Adele')",
      },
    },
    required: ['query'],
  },
};

interface CreatePaymentLinkFunctionDeclaration {
  name: string;
  description: string;
  parametersJsonSchema: {
    type: 'object';
    properties: {
      amount: {
        type: 'number';
        description: string;
      };
      itemDescription: {
        type: 'string';
        description: string;
      };
    };
    required: ['amount', 'itemDescription'];
  };
}

const createPaymentLinkTool: CreatePaymentLinkFunctionDeclaration = {
  name: 'create_payment_link',
  description:
    'Create a payment link for the user to purchase a product or subscription. Use this when the user explicitly confirms they want to buy something.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        description: 'The price of the item in IQD (e.g. 50000)',
      },
      itemDescription: {
        type: 'string',
        description: 'Short description of the item being purchased',
      },
    },
    required: ['amount', 'itemDescription'],
  },
};

const tools: Tool[] = [
  {
    functionDeclarations: [searchProductsTool, createPaymentLinkTool],
  },
];

// --- Helpers ---

function isValidSearchQuery(query: unknown): query is string {
  return typeof query === 'string' && query.trim().length > 0;
}

function escapeIlikePattern(value: string): string {
  // Escape backslash first to avoid double-escaping
  return value.replace(/([\\%_])/g, '\\$1');
}

// --- Tool Implementations ---

/**
 * Searches Supabase products table using a case-insensitive ILIKE query.
 */
async function searchProducts(query: string) {
  const MAX_LOG_QUERY_LENGTH = 100;
  const rawQuery = String(query);
  const sanitizedQuery = rawQuery.replace(/[\r\n\t]/g, ' ');
  const safeQueryForLog =
    sanitizedQuery.length > MAX_LOG_QUERY_LENGTH
      ? `${sanitizedQuery.slice(0, MAX_LOG_QUERY_LENGTH)}…`
      : sanitizedQuery;
  // biome-ignore lint/suspicious/noConsole: logging is fine for search tracking
  console.log(
    `Searching products for query (truncated if long): "${safeQueryForLog}"`,
  );
  const escapedQuery = escapeIlikePattern(query);
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, stock_count')
    .ilike('name', `%${escapedQuery}%`)
    .limit(MAX_PRODUCT_SEARCH_RESULTS);

  if (error) {
    // biome-ignore lint/suspicious/noConsole: logging is fine
    console.error('Supabase search error:', error);
    return {
      error:
        "We couldn't complete your product search. Please try again shortly.",
    };
  }

  if (!data || data.length === 0) {
    return { message: 'No products found matching that name.' };
  }

  return { products: data };
}

/**
 * Creates a payment link via Wayl (using PaymentEngine).
 */
async function createPaymentLink(amount: number, itemDescription: string) {
  try {
    const provider = PaymentFactory.getProviderByName('wayl', {
      waylKey: env.WAYL_SECRET_KEY,
      waylWebhookSecret: env.WAYL_WEBHOOK_SECRET,
      zainKey: '', // Not used here
    });

    const session = await provider.createCheckoutSession({
      referenceId: `droid-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      amount,
      currency: 'IQD',
      description: itemDescription,
      redirectionUrl: `${env.WEB_APP_URL}/thanks`,
      webhookUrl: `${env.WEB_APP_URL}/api/webhooks/wayl`,
      webhookSecret: env.WAYL_WEBHOOK_SECRET,
    });

    return {
      success: true,
      url: session.url,
      message: `Payment link created for ${itemDescription}. Please share this URL with the user.`,
    };
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: logging is fine
    console.error('Payment Create Link Error:', error);
    return {
      error: 'Failed to generate payment link. Please try again later.',
    };
  }
}

// --- Main Generator ---

/**
 * Generates a response from Gemini AI.
 * Handles function calling (Tool Use) for product searches and payments.
 *
 * @param history - Conversation history.
 * @param message - User's current message.
 * @returns The AI's response text.
 */
export async function generateResponse(
  history: Content[],
  message: string,
): Promise<string> {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: history,
      config: {
        tools: tools,
        // System instruction defines the Persona and Business Knowledge.
        systemInstruction:
          'You are Droid, the official AI assistant for The IDEA (Innovation for Every Aspect of Life). ' +
          'You are helpful, professional, and knowledgeable about our ecosystem: ' +
          '1. MegaStore (Gaming & Tech Retail) ' +
          '2. Plus (Gaming Subscription Service) ' +
          '3. Academy (Tech Education) ' +
          '4. Suite (Business Solutions). ' +
          'Always maintain a polite, modern, and concise tone. ' +
          "If a user asks about product prices, stock, or availability, you MUST use the 'search_products' tool to find real-time data. " +
          "If a user explicitly says they want to buy something or asks for a payment link, verify the item and price first (using search if needed), then use the 'create_payment_link' tool.",
      },
    });

    const result = await chat.sendMessage({ message });
    const functionCalls = result.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (!call) return '';
      const rawArgs = call.args as Record<string, unknown>;

      if (call.name === 'search_products') {
        const query = rawArgs.query;

        if (!isValidSearchQuery(query)) {
          return "I couldn't understand the product you want to search for.";
        }

        const productData = await searchProducts(query);
        const finalResult = await chat.sendMessage({
          message: [
            {
              functionResponse: {
                name: 'search_products',
                response: productData,
              },
            },
          ],
        });
        return finalResult.text || '';
      }

      if (call.name === 'create_payment_link') {
        const amount = Number(rawArgs.amount);
        const description = String(rawArgs.itemDescription);

        if (Number.isNaN(amount) || amount <= 0) {
          return 'I need a valid amount to generate a payment link.';
        }

        const paymentData = await createPaymentLink(amount, description);
        const finalResult = await chat.sendMessage({
          message: [
            {
              functionResponse: {
                name: 'create_payment_link',
                response: paymentData,
              },
            },
          ],
        });
        return finalResult.text || '';
      }
    }

    return result.text || '';
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: logging is fine
    console.error('Gemini Error:', error);

    // Derive a more specific, user-safe error message without exposing internal details.
    const err = error as unknown;
    let userMessage =
      'I had trouble talking to the AI service. Please try again in a moment.';

    if (err && typeof err === 'object') {
      const anyErr = err as {
        message?: string;
        code?: string | number;
        status?: number;
        statusCode?: number;
      };

      const message = (anyErr.message || '').toLowerCase();
      const status = anyErr.status ?? anyErr.statusCode;

      if (message.includes('api key') || status === 401 || status === 403) {
        userMessage =
          'The AI service is currently misconfigured or unavailable. Please try again later.';
      } else if (status === 429) {
        userMessage =
          'I am receiving too many requests right now. Please try again in a minute.';
      }
    }

    return userMessage;
  }
}
