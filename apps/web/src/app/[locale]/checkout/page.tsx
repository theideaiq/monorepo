import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Checkout | The IDEA',
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/checkout`);
  }

  return (
    <div className="container mx-auto px-4 py-12 pt-24 min-h-screen">
      <h1 className="text-3xl font-black text-white mb-8 tracking-tight">
        Checkout
      </h1>
      <CheckoutFlow />
    </div>
  );
}
