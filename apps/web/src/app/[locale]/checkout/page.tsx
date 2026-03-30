import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Checkout | The IDEA',
  description: 'Complete your purchase securely.',
};

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Optionally protect route - wait to see if we want guest checkout
  // For now, let's require login
  if (!user) {
    redirect('/login?next=/checkout');
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 pt-24 min-h-screen">
      <h1 className="text-3xl font-black text-white mb-8">Checkout</h1>
      <CheckoutFlow />
    </div>
  );
}
