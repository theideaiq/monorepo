import type { Metadata } from 'next';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Secure checkout for your order',
};

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/checkout');
  }

  return <CheckoutFlow user={user} />;
}
