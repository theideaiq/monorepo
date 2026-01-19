import { Logger } from '@repo/utils';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { wayl } from '@/services/wayl';

const checkoutSchema = z.object({
  amount: z
    .number('Invalid amount: must be a positive number')
    .positive('Invalid amount: must be a positive number'),
  planName: z
    .string('Invalid planName: must be a non-empty string')
    .trim()
    .min(1, 'Invalid planName: must be a non-empty string'),
  userEmail: z
    .string('Invalid userEmail: must be a valid email address')
    .email('Invalid userEmail: must be a valid email address')
    .max(255, 'Invalid userEmail: must be less than 255 characters'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Zod Validation
    const result = checkoutSchema.safeParse(body);

    if (!result.success) {
      // Return the first error message
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      );
    }

    const { amount, planName, userEmail } = result.data;

    // 1. Create the Payment Link with Wayl
    // This uses the "wayl.ts" helper we built earlier
    const paymentUrl = await wayl.createPayment(
      amount,
      'IQD',
      `Subscription: ${planName} for ${userEmail}`,
    );

    // 2. Return the link to the frontend
    return NextResponse.json({ url: paymentUrl });
  } catch (error) {
    Logger.error('Checkout Error:', error);
    return NextResponse.json(
      {
        error: 'Payment creation failed',
      },
      { status: 500 },
    );
  }
}
