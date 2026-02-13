import { createServiceRoleClient } from '@repo/database/service';
import { webEnv } from '@repo/env/web';
import { Logger } from '@repo/utils';
import { type NextRequest, NextResponse } from 'next/server';
import { paymentFactory } from '@/lib/payment/config';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerName = searchParams.get('provider');

    if (!providerName) {
      return NextResponse.json(
        { error: 'Missing provider param' },
        { status: 400 },
      );
    }

    const rawBody = await request.text();

    const provider = paymentFactory.getProviderByName(providerName);

    // Retrieve signature from headers. Currently defaulting to Wayl's header.
    // Future providers may need specific logic here.
    const signature = request.headers.get('x-wayl-signature') || undefined;

    const event = await provider.verifyWebhook(rawBody, signature);

    if (event.type === 'payment.success') {
      const supabase = createServiceRoleClient(
        webEnv.NEXT_PUBLIC_SUPABASE_URL,
        webEnv.SUPABASE_SERVICE_ROLE_KEY,
      );

      // Find order by gateway_link_id (which corresponds to event.id from WaylAdapter)
      const { data: order, error: findError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('gateway_link_id', event.id)
        .single();

      if (findError || !order) {
        Logger.error('Order not found for payment:', event.id);
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (order.status !== 'paid') {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('id', order.id);

        if (updateError) {
          Logger.error('Failed to update order status:', updateError);
          return NextResponse.json({ error: 'Update failed' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    Logger.error('Webhook Error:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    );
  }
}
