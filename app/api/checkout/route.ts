import { NextResponse } from 'next/server';
import { wayl } from '@/lib/wayl';
import { createClient } from '@supabase/supabase-js';

// Connect to Supabase to verify user is logged in
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, planName, userEmail } = body;

    // 1. Create the Payment Link with Wayl
    // This uses the "wayl.ts" helper we built earlier
    const paymentUrl = await wayl.createPayment(
      amount, 
      "IQD", 
      `Subscription: ${planName} for ${userEmail}`
    );

    // 2. Return the link to the frontend
    return NextResponse.json({ url: paymentUrl });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Checkout Error:", error);
    return NextResponse.json(
      { error: error.message || "Payment creation failed" },
      { status: 500 }
    );
  }
}
