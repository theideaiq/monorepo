import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/client';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  attributes?: Record<string, string>;
}

/**
 * Ensures a valid session/guest cart ID exists.
 * In a real app this would attach to an authenticated user ID if logged in.
 */
async function getOrCreateCartId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (cart) return cart.id;

  const { data: newCart } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single();

  return newCart?.id || null;
}

/**
 * Fetches the user's cart from the database.
 */
export async function getCart(): Promise<CartItem[]> {
  const supabase = createClient();
  const cookieStore = await cookies();
  // Using a simplistic guest ID for demonstration
  const userId = cookieStore.get('device_id')?.value || 'guest-123';

  const cartId = await getOrCreateCartId(supabase, userId);
  if (!cartId) return [];

  const { data: items, error } = await supabase
    .from('cart_items')
    .select(
      `
      id,
      quantity,
      attributes,
      product_id,
      products (
        name,
        price,
        image_url
      )
    `,
    )
    .eq('cart_id', cartId);

  if (error) {
    console.error('Error fetching cart:', error);
    return [];
  }

  // Type assertion since we know the structure of the joined query
  return (items as Array<Record<string, unknown>>).map((item) => ({
    id: String(item.id),
    productId: String(item.product_id),
    title: (item.products as any)?.name || 'Unknown',
    price: (item.products as any)?.price || 0,
    image: (item.products as any)?.image_url || '',
    quantity: Number(item.quantity),
    attributes: (item.attributes as Record<string, string>) || {},
  }));
}
