"use client";

import { useTranslations } from "next-intl";
import { VerifyPhone } from "@/components/verify-phone";
import type { CheckoutError } from "@/lib/errors";

interface CheckoutErrorNoteProps {
  readonly error: CheckoutError | null;
  /** Clears the error once the phone is verified. */
  readonly onPhoneVerified: () => void;
  /** The delivery phone, as typed. */
  readonly phone: string;
}

/**
 * Why placing the order failed; for an unverified delivery phone, the
 * code step to verify it right here.
 */
export const CheckoutErrorNote = ({
  error,
  onPhoneVerified,
  phone,
}: CheckoutErrorNoteProps) => {
  const t = useTranslations("app.checkout");
  if (!error) {
    return null;
  }
  return (
    <div className="grid gap-3">
      <p className="text-destructive text-sm" role="alert">
        {t(`errors.${error}`)}
      </p>
      {error === "phoneUnverified" && phone ? (
        <VerifyPhone onVerified={onPhoneVerified} phone={phone} />
      ) : null}
    </div>
  );
};
