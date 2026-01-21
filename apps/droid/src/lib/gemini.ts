import { type Content, GoogleGenAI, type Tool } from '@google/genai';
import { droidEnv as env } from '@repo/env/droid';
import { supabase } from './supabase';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const MAX_PRODUCT_SEARCH_RESULTS = 5;

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

const tools: Tool[] = [
  {
    functionDeclarations: [searchProductsTool],
  },
];

function isValidSearchQuery(query: unknown): query is string {
  return typeof query === 'string' && query.trim().length > 0;
}

function escapeIlikePattern(value: string): string {
  // Escape backslash first to avoid double-escaping
  return value.replace(/([\\%_])/g, '\\$1');
}

async function searchProducts(query: string) {
  const MAX_LOG_QUERY_LENGTH = 100;
  const rawQuery = String(query);
  const sanitizedQuery = rawQuery.replace(/[\r\n\t]/g, ' ');
  const safeQueryForLog =
    sanitizedQuery.length > MAX_LOG_QUERY_LENGTH
      ? sanitizedQuery.slice(0, MAX_LOG_QUERY_LENGTH) + '…'
      : sanitizedQuery;
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
    const maybeErrorObject =
      typeof error === 'object' ? (error as Record<string, unknown>) : null;
    const errorCode =
      maybeErrorObject && typeof maybeErrorObject.code === 'string'
        ? maybeErrorObject.code
        : null;
    const errorMessage =
      maybeErrorObject && typeof maybeErrorObject.message === 'string'
        ? maybeErrorObject.message
        : String(error);

    return {
      error:
        "We couldn't complete your product search. Please try again shortly or refine your search query.",
      code: 'SUPABASE_SEARCH_ERROR',
      details: {
        // Limit details to non-sensitive, high-level information
        code: errorCode,
        message: errorMessage,
      },
    };
  }

  if (!data || data.length === 0) {
    return { message: 'No products found matching that name.' };
  }

  return { products: data };
}

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
        systemInstruction:
          'You are Droid, the official AI assistant for The IDEA (Innovation for Every Aspect of Life). ' +
          'You are helpful, professional, and knowledgeable about our ecosystem: ' +
          '1. MegaStore (Gaming & Tech Retail) ' +
          '2. Plus (Gaming Subscription Service) ' +
          '3. Academy (Tech Education) ' +
          '4. Suite (Business Solutions). ' +
          'Always maintain a polite, modern, and concise tone. ' +
          "If a user asks about product prices, stock, or availability, you MUST use the 'search_products' tool to find real-time data.",
      },
    });

    const result = await chat.sendMessage({ message });
    const functionCalls = result.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === 'search_products') {
        const rawArgs = call.args;
        const query =
          rawArgs && typeof rawArgs === 'object'
            ? (rawArgs as Record<string, unknown>).query
            : undefined;

        if (!isValidSearchQuery(query)) {
          // biome-ignore lint/suspicious/noConsole: logging is fine
          console.error(
            'Invalid arguments for search_products tool call:',
            rawArgs,
          );
          return "I couldn't understand the product you want to search for. Please try again with a clear product name or short description, for example: 'wireless headphones', 'iPhone 15 case', or '4K monitor'.";
        }

        const productData = await searchProducts(query);

        // Send the function response back to the model
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

        return (
          finalResult.text ||
          "I couldn't generate a follow-up answer based on the product search. Please try again."
        );
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

      // Likely configuration or authentication issue with the AI service.
      if (
        message.includes('api key') ||
        message.includes('unauthorized') ||
        message.includes('invalid authentication') ||
        message.includes('permission') ||
        status === 401 ||
        status === 403
      ) {
        userMessage =
          'The AI service is currently misconfigured or unavailable. Please try again later.';
      }
      // Transient network / rate limit / server errors from the provider.
      else if (
        status === 429 ||
        (typeof status === 'number' && status >= 500 && status <= 599) ||
        message.includes('network error') ||
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('etimedout') ||
        message.includes('econnrefused') ||
        message.includes('enotfound')
      ) {
        userMessage =
          'The AI service is temporarily unavailable due to a connection issue. Please wait a moment and try again.';
      }
    }

    return userMessage;
  }
}
