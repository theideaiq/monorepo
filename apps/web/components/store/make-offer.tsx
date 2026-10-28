"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice } from "@repo/commerce";
import type { Database } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { localePath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { HandCoinsIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import {
  isDuplicateOffer,
  type OfferStatus,
  useMakeOffer,
  useOfferableListings,
} from "@/lib/make-offer-queries";
import { productHref } from "./product-card";

type Condition = Database["public"]["Enums"]["product_condition"];

/** What a sent offer came to, in the words shown under the form. */
const RESULT_KEYS: Partial<
  Record<OfferStatus, "accepted" | "declined" | "sent">
> = {
  accepted: "accepted",
  declined: "declined",
  open: "sent",
};

/**
 * "Make an offer" under the cart button, on listings whose seller takes
 * offers: an amount from the listing's lowest offer up to just under its
 * price. The seller (or their automatic answers) replies within 48 hours.
 */
export const MakeOffer = ({
  condition,
  price,
  productId,
  sellerId,
  slug,
  variantId,
}: {
  readonly condition: Condition;
  readonly price: number;
  readonly productId: string;
  readonly sellerId: string;
  readonly slug: string;
  readonly variantId: string | null;
}) => {
  const t = useTranslations("app.offers.make");
  const locale = useLocale();
  const { user } = useAuth();
  const listings = useOfferableListings(productId);
  const make = useMakeOffer();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const inputId = useId();

  const listing = (listings.data ?? []).find(
    (item) =>
      item.seller_id === sellerId &&
      item.variant_id === variantId &&
      item.condition === condition
  );
  if (!(listing && variantId)) {
    return null;
  }

  if (!user) {
    return (
      <p className="text-sm">
        <Link
          className="font-medium text-pink-text hover:underline"
          href={{
            pathname: "/sign-in",
            query: { return_to: localePath(locale, productHref(slug)) },
          }}
        >
          {t("signIn")}
        </Link>
      </p>
    );
  }

  const value = Number(amount);
  const valid =
    Number.isInteger(value) && value >= listing.min_offer && value < price;
  const result = make.data ? RESULT_KEYS[make.data.status] : undefined;

  if (!open) {
    return (
      <Button
        className="justify-self-start"
        onClick={() => setOpen(true)}
        variant="outline"
      >
        <HandCoinsIcon />
        {t("button")}
      </Button>
    );
  }

  return (
    <form
      className="grid gap-2 rounded-lg border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) {
          make.mutate({ amount: value, condition, sellerId, variantId });
        }
      }}
    >
      <Label htmlFor={inputId}>{t("label")}</Label>
      <p className="text-muted-foreground text-xs">
        {t("range", {
          min: formatPrice(listing.min_offer, locale),
          price: formatPrice(price, locale),
        })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          className="w-40"
          id={inputId}
          inputMode="numeric"
          min={listing.min_offer}
          onChange={(event) => setAmount(event.target.value)}
          type="number"
          value={amount}
        />
        <Button disabled={!valid || make.isPending} type="submit">
          {make.isPending ? t("sending") : t("send")}
        </Button>
      </div>
      {result ? (
        <p className="text-sm" role="status">
          {t(`result.${result}`, {
            amount: formatPrice(make.data?.amount ?? 0, locale),
          })}{" "}
          <Link
            className="font-medium text-pink-text hover:underline"
            href={
              make.data?.status === "accepted" ? "/cart" : "/pass/saved#offers"
            }
          >
            {t(make.data?.status === "accepted" ? "viewCart" : "follow")}
          </Link>
        </p>
      ) : null}
      {make.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t(isDuplicateOffer(make.error) ? "duplicate" : "failed")}
        </p>
      ) : null}
    </form>
  );
};
