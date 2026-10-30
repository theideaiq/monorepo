"use client";

import { useTranslations } from "next-intl";
import { toAgeError } from "@/lib/errors";

/**
 * A failed action's message: the age rule that refused it (18+, a missing
 * date of birth, a guardian's approval), else `fallback`.
 */
export const AgeAwareError = ({
  error,
  fallback,
}: {
  readonly error: unknown;
  readonly fallback: string;
}) => {
  const t = useTranslations("app.ages");
  const age = toAgeError(error);
  const message = age ? t(age) : fallback;
  return (
    <p className="text-destructive text-sm" role="alert">
      {message}
    </p>
  );
};
