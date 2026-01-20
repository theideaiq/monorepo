import {
  type Content,
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclarationSchema,
  type Tool,
} from '@google/generative-ai';
import { droidEnv as env } from '@repo/env/droid';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// explicitly typed to satisfy strict TypeScript checks
const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'search_products',
        description:
          'Search for products in the catalog by name. Use this when the user asks about product availability, price, or description.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description:
                "The product name or keyword to search for (e.g. 'PlayStation', 'Adele')",
              nullable: false,
            },
          },
          required: ['query'],
        } as FunctionDeclarationSchema,
      },
    ],
  },
];

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  tools: tools,
});

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
    const chat = model.startChat({
      history: history,
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === 'search_products') {
        const args = call.args as { query: string };
        const productData = await searchProducts(args.query);

        // Send the function response back to the model
        const result2 = await chat.sendMessage([
          {
            functionResponse: {
              name: 'search_products',
              response: productData,
            },
          },
        ]);

        return result2.response.text();
      }
    }

    return response.text();
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: logging is fine
    console.error('Gemini Error:', error);
    return "I'm having trouble thinking right now. Please try again later.";
  }
}
