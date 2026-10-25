"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useState } from "react";
import {
  normalizeAffiliateCode,
  useAffiliateReferrer,
  useTouchAffiliate,
} from "@/lib/affiliates";

/**
 * An affiliate's code at checkout: 5% off, replacing any link followed
 * before. Shows the code that applies, if any.
 */
export const AffiliateCodeCard = ({ busy }: { readonly busy: boolean }) => {
  const t = useTranslations("app.checkout.affiliate");
  const referrer = useAffiliateReferrer();
  const touch = useTouchAffiliate();
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);

  // Inside the checkout form: applied with its own button (or Enter), never
  // by submitting the order.
  const apply = () => {
    const clean = normalizeAffiliateCode(code);
    setInvalid(!clean);
    if (clean) {
      touch.mutate(
        { code: clean, via: "code" },
        {
          onError: () => setInvalid(true),
          onSuccess: () => setCode(""),
        }
      );
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      apply();
    }
  };

  const applied = referrer.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription role="status">
          {applied
            ? t("applied", {
                code: applied.code ?? "",
                name: applied.name ?? "",
              })
            : t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid min-w-0 flex-1 gap-2">
            <Label htmlFor="affiliate-code">{t("label")}</Label>
            <Input
              aria-invalid={invalid}
              autoCapitalize="characters"
              dir="ltr"
              id="affiliate-code"
              maxLength={20}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={onKeyDown}
              value={code}
            />
          </div>
          <Button
            disabled={busy || touch.isPending || !code.trim()}
            onClick={apply}
            type="button"
            variant="outline"
          >
            {t("apply")}
          </Button>
        </div>
        {invalid ? (
          <p className="mt-2 text-destructive text-sm" role="alert">
            {t("invalid")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};
