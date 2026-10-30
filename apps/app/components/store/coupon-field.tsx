"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import {
  type CouponProblem,
  useApplyCoupon,
  useRemoveCoupon,
} from "@/lib/store-queries";

interface CouponFieldProps {
  /** The code applied to the cart, if any. */
  readonly applied: string | null;
  /** Whether the quote takes the code off (it may need a bigger order, or the invite takes off more). */
  readonly used: boolean;
}

/**
 * The checkout's coupon code: apply one, or remove the one applied. A code
 * that isn't taken off (another discount takes off more, or it no longer
 * applies) says so.
 */
export const CouponField = ({ applied, used }: CouponFieldProps) => {
  const t = useTranslations("app.checkout.coupon");
  const id = useId();
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<CouponProblem | "failed" | null>(null);
  const apply = useApplyCoupon();
  const remove = useRemoveCoupon();
  const busy = apply.isPending || remove.isPending;

  const onApply = (event: FormEvent) => {
    // The field sits inside the checkout form: never submit the order.
    event.preventDefault();
    event.stopPropagation();
    if (!code.trim()) {
      return;
    }
    setProblem(null);
    apply.mutate(code, {
      onError: () => setProblem("failed"),
      onSuccess: (answer) => {
        setProblem(answer);
        if (!answer) {
          setCode("");
        }
      },
    });
  };

  if (applied) {
    return (
      <div className="grid gap-1">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span dir="auto">{t("applied", { code: applied })}</span>
          <Button
            disabled={busy}
            onClick={() => remove.mutate()}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("remove")}
          </Button>
        </div>
        {used ? null : (
          <p className="text-muted-foreground text-xs">{t("notUsed")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <label className="font-medium text-sm" htmlFor={id}>
        {t("label")}
      </label>
      <div className="flex gap-2">
        <Input
          autoCapitalize="characters"
          autoComplete="off"
          className="uppercase"
          dir="ltr"
          id={id}
          maxLength={24}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onApply(event);
            }
          }}
          value={code}
        />
        <Button
          disabled={busy || !code.trim()}
          onClick={onApply}
          type="button"
          variant="outline"
        >
          {t("apply")}
        </Button>
      </div>
      {problem ? (
        <p className="text-destructive text-xs" role="alert">
          {t(`problem.${problem}`)}
        </p>
      ) : null}
    </div>
  );
};
