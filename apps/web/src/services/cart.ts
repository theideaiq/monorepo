import { Logger } from '@repo/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/client';

export interface CartItem {
  id: string; // cart_item id
  productId: string;
  quantity: number;
  product: {
    name: string;
    price: number;
    image: string;
    slug: string;
  };
}

/**
 * Gets the current user's active cart or creates one.
 */
async function getOrCreateCartId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  // 1. Check for existing cart
  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (cart) return cart.id;

  // 2. Create new cart
  const { data: newCart, error } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (error) {
    Logger.error('Error creating cart:', error);
    return null;
  }
  return newCart.id;
}

export async function fetchCartItems(): Promise<CartItem[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return []; // Guest cart handled by local storage (Zustand)

  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!cart) return [];

  const { data: items, error } = await supabase
    .from('cart_items')
    .select('*, product:products(name, price, image_url, slug)')
    .eq('cart_id', cart.id);

  if (error) {
    Logger.error('Error fetching cart items:', error);
    return [];
  }

  return items.map((item) => ({
    id: item.id,
    productId: item.product_id as string,
    quantity: item.quantity ?? 1,
    product: {
      // biome-ignore lint/suspicious/noExplicitAny: Temporary workaround for Supabase join typing
      name: (item.product as any)?.name as string,
      // biome-ignore lint/suspicious/noExplicitAny: Temporary workaround for Supabase join typing
      price: (item.product as any)?.price as number,
      // biome-ignore lint/suspicious/noExplicitAny: Temporary workaround for Supabase join typing
      image: (item.product as any)?.image_url as string,
      // biome-ignore lint/suspicious/noExplicitAny: Temporary workaround for Supabase join typing
      slug: (item.product as any)?.slug as string,
    },
  }));
}

export async function addToCartDB(
  productId: string,
  quantity = 1,
): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false; // Indicate caller to use local store

  const cartId = await getOrCreateCartId(supabase, user.id);
  if (!cartId) return false;

  // Check if item exists
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', productId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
    return !error;
  }

  const { error } = await supabase.from('cart_items').insert({
    cart_id: cartId,
    product_id: productId,
    quantity,
  });

  return !error;
}

export async function removeFromCartDB(itemId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
  return !error;
}
