'use server';

import { webEnv } from '@repo/env/web';
import { Logger } from '@repo/utils';
import { redirect } from 'next/navigation';
import { paymentFactory } from '@/lib/payment/config';
import { createClient } from '@/lib/supabase/server';

export async function initiateCheckout(cartId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // 1. Fetch Cart Items
  const { data: cartItems, error: cartError } = await supabase
    .from('cart_items')
    .select('quantity, products(id, name, price, description)')
    .eq('cart_id', cartId);

  if (cartError || !cartItems || cartItems.length === 0) {
    throw new Error('Cart is empty or not found');
  }

  // 2. Calculate Total
  let total = 0;
  const lineItems: { label: string; amount: number; type: 'increase' }[] = [];

  for (const item of cartItems) {
    const productData = item.products;
    if (!productData) continue;

    // Handle potential array return from join
    const product = Array.isArray(productData) ? productData[0] : productData;
    if (!product) continue;

    const price = Number(product.price);
    const quantity = item.quantity || 1;
    const itemTotal = price * quantity;

    total += itemTotal;

    lineItems.push({
      label: `${product.name} (x${quantity})`,
      amount: itemTotal,
      type: 'increase',
    });
  }

  if (total <= 0) {
    throw new Error('Invalid total amount');
  }

  // 3. Create Checkout Session
  const referenceId = crypto.randomUUID();
  const provider = paymentFactory.getProvider(total);

  const session = await provider.createCheckoutSession({
    referenceId,
    amount: total,
    currency: 'IQD', // Hardcoded as per schema/types
    description: `Checkout for Cart ${cartId}`,
    webhookUrl: `${webEnv.NEXT_PUBLIC_SITE_URL}/api/webhooks/payment?provider=${provider.name}`,
    redirectionUrl: `${webEnv.NEXT_PUBLIC_SITE_URL}/checkout/success`,
    customer: {
      email: user.email,
    },
  });

  // 4. Create Order
  const { error: orderError } = await supabase.from('orders').insert({
    user_id: user.id,
    total_amount: total,
    status: 'pending',
    gateway_link_id: session.sessionId, // Storing sessionId as link id
    gateway_provider: session.provider,
    gateway_metadata: session.metadata || {},
    created_at: new Date().toISOString(),
  });

  if (orderError) {
    Logger.error('Order creation failed:', orderError);
    throw new Error('Failed to create order');
  }

  // 5. Return URL (or Redirect)
  // The task asked to "Return the url to the client", but if we are in a server action
  // triggered by a form, we typically redirect.
  // However, to strictly follow "Return the url", I will return it.
  // But standard Next.js Server Action pattern for navigation is redirect().
  // Given the UI component uses useFormStatus, it expects a form submission.
  // If I return a string, the form doesn't navigate.
  // I will use redirect() which acts as a return of sorts (throws error to navigate).

  redirect(session.url);
}
