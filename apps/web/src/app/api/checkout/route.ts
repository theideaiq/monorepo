import { NextResponse } from 'next/server';
import { wayl } from '@/lib/wayl';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, planName, userEmail } = body;

    // Input Validation
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number' },
        { status: 400 },
      );
    }

    if (
      !planName ||
      typeof planName !== 'string' ||
      planName.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Invalid planName: must be a non-empty string' },
        { status: 400 },
      );
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !userEmail ||
      typeof userEmail !== 'string' ||
      !emailRegex.test(userEmail)
    ) {
      return NextResponse.json(
        { error: 'Invalid userEmail: must be a valid email address' },
        { status: 400 },
      );
    }

    // 1. Create the Payment Link with Wayl
    // This uses the "wayl.ts" helper we built earlier
    const paymentUrl = await wayl.createPayment(
      amount,
      'IQD',
      `Subscription: ${planName} for ${userEmail}`,
    );

    // 2. Return the link to the frontend
    return NextResponse.json({ url: paymentUrl });

    // biome-ignore lint/suspicious/noExplicitAny: migration
  } catch (error: any) {
    console.error('Checkout Error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment creation failed' },
      { status: 500 },
    );
  }
}
