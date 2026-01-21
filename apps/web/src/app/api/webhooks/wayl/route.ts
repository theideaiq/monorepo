import { Logger } from '@repo/utils';
import { NextResponse } from 'next/server';

// Basic verification - in production, this should verify the JWT signature
// against the WAYL_WEBHOOK_SECRET if Wayl provides a signed payload.
// For now, we'll assume the payload contains the necessary status info.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const headers = req.headers;

    // Verify signature
    // Note: The actual signature header and algorithm depends on Wayl's specific implementation
    // which usually involves HMAC-SHA256 of the body with the secret.
    const signature = headers.get('X-Wayl-Signature');
    if (!signature && process.env.NODE_ENV === 'production') {
      Logger.warn('Missing Wayl Signature');
      // Uncomment to enforce security once the provider starts sending it
      // return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    Logger.log('Wayl Webhook Received:', body);

    const { status, referenceId, paymentMethod } = body;

    if (status === 'Complete') {
      Logger.log(
        `Payment Complete for Order ${referenceId} via ${paymentMethod}`,
      );
      // TODO: Fulfill order in database
      // await supabase.from('orders').update({ status: 'paid' }).eq('id', referenceId);
    } else if (status === 'Cancelled' || status === 'Rejected') {
      Logger.warn(`Payment Failed/Cancelled for Order ${referenceId}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    Logger.error('Wayl Webhook Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
