import { GoogleGenAI, type Content, type Tool } from '@google/genai';
import { droidEnv as env } from '@repo/env/droid';
import { supabase } from './supabase';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// Explicitly typed to satisfy strict TypeScript checks
// biome-ignore lint/suspicious/noExplicitAny: parametersJsonSchema is missing in types but valid in runtime
const searchProductsTool: any = {
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
    return { error: 'Error searching for products.' };
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
      model: 'gemini-3-flash',
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
        const args = call.args as { query: string };
        const productData = await searchProducts(args.query);

        // Send the function response back to the model
        const result2 = await chat.sendMessage({
          message: [
            {
              functionResponse: {
                name: 'search_products',
                response: productData,
              },
            },
          ],
        });

        return result2.text || "";
      }
    }

    return result.text || "";
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: logging is fine
    console.error('Gemini Error:', error);
    return "I'm having trouble thinking right now. Please try again later.";
  }
}
