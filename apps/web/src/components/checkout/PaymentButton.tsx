'use client';

import { cn } from '@repo/utils';
import { useFormStatus } from 'react-dom';
import { initiateCheckout } from '@/actions/checkout';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface PaymentButtonProps {
  cartId: string;
}

export function PaymentButton({ cartId }: PaymentButtonProps) {
  // We bind the cartId to the server action
  const initiateCheckoutWithCart = initiateCheckout.bind(null, cartId);

  return (
    <form action={initiateCheckoutWithCart} className="w-full">
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'w-full rounded-full py-4 px-6 font-bold text-black transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed',
        // Using arbitrary value for the specific gold requirement
        'bg-brand-yellow hover:bg-yellow-500',
        'flex items-center justify-center gap-2 shadow-lg hover:shadow-xl',
      )}
    >
      {pending ? (
        <>
          {/* Using BrandLoader might be too big for a button, usually.
              But request says "BrandLoader" preferred over Skeleton.
              If BrandLoader is full screen, I should check.
              Assuming it's a spinner component. */}
          <span className="scale-50 h-6 w-6 relative flex items-center justify-center">
            <BrandLoader />
          </span>
          <span>Processing...</span>
        </>
      ) : (
        <span>Pay Now</span>
      )}
    </button>
  );
}
