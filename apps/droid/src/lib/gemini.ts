import { GoogleGenAI, type Content, type Tool } from '@google/genai';
import { droidEnv as env } from '@repo/env/droid';
import { supabase } from './supabase';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

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

async function searchProducts(query: string) {
  // biome-ignore lint/suspicious/noConsole: logging is fine
  console.log(`Searching products for: ${query}`);
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, stock_count')
    .ilike('name', `%${query}%`)
    .limit(5);

  if (error) {
    // biome-ignore lint/suspicious/noConsole: logging is fine
    console.error('Supabase search error:', error);
    return {
      error: 'Error searching for products.',
      code: 'SUPABASE_SEARCH_ERROR',
      details: {
        // Limit details to non-sensitive, high-level information
        code: (error as any).code ?? null,
        message: (error as any).message ?? String(error),
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
      }
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

        if (typeof query !== 'string' || query.trim().length === 0) {
          // biome-ignore lint/suspicious/noConsole: logging is fine
          console.error('Invalid arguments for search_products tool call:', rawArgs);
          return "I couldn't understand the product you want to search for. Please try again with a product name.";
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

        return finalResult.text || "";
      }
    }

    return result.text || "";
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: logging is fine
    console.error('Gemini Error:', error);
    return 'Something went wrong while generating a response. Please try again in a moment.';
  }
}
