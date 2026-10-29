"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { localePath } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { useRouter } from "@repo/internationalization/navigation";
import { CalendarClockIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { productHref } from "@/components/store/product-card";
import { type RentalCartError, toRentalCartError } from "@/lib/errors";
import { KEEP_AFTER_LATE_DAYS, useRentalQuote } from "@/lib/rent";
import { useAddRental } from "@/lib/store-queries";

/**
 * Renting the item on its own, without The IDEA Plus: the price for so
 * many days, the deposit (refunded at return) and the fee per day late.
 * "Rent it" puts it in the cart, with everything else; signed out, it
 * goes to the sign-in and back here. Hidden when the item can't be rented
 * on its own.
 */
export const RentCard = ({
  available,
  productId,
  slug,
  variant,
  variantId,
}: {
  /** Copies free to rent of the chosen version. */
  readonly available: number;
  readonly productId: string;
  readonly slug: string;
  /** The chosen version's slug, kept in the rent link. */
  readonly variant?: string | null;
  readonly variantId: string | null;
}) => {
  const t = useTranslations("app.store.product.rent");
  const tRent = useTranslations("app.rent");
  const locale = useLocale();
  const days = (count: number) =>
    tRent("days", { count, n: formatNumber(count, locale) });
  const quote = useRentalQuote(productId, variantId).data;
  const { user } = useAuth();
  const router = useRouter();
  const add = useAddRental();
  const error: RentalCartError | null = add.isError
    ? toRentalCartError(add.error)
    : null;

  if (!quote) {
    return null;
  }

  const rent = () => {
    if (!user) {
      router.push({
        pathname: "/sign-in",
        query: {
          return_to: `${localePath(locale, productHref(slug))}${
            variant ? `?variant=${encodeURIComponent(variant)}` : ""
          }`,
        },
      });
      return;
    }
    add.mutate(
      { productId, variantId },
      { onSuccess: () => router.push("/cart") }
    );
  };
  return (
    <div className="grid gap-3 rounded-md border p-4">
      <p className="flex items-center gap-2 font-medium">
        <CalendarClockIcon
          aria-hidden="true"
          className="size-4 text-pink-text"
        />
        {t("title")}
      </p>
      <p className="text-sm">
        {t("price", {
          days: days(quote.days),
          price: formatPrice(quote.price, locale),
        })}
      </p>
      <ul className="grid gap-1 text-muted-foreground text-sm">
        <li>{t("deposit", { deposit: formatPrice(quote.deposit, locale) })}</li>
        <li>
          {t("lateFee", {
            days: days(KEEP_AFTER_LATE_DAYS),
            fee: formatPrice(quote.lateFee, locale),
          })}
        </li>
      </ul>
      {available > 0 ? (
        <Button
          className="justify-self-start"
          disabled={add.isPending || add.isSuccess}
          onClick={rent}
          variant="outline"
        >
          {t("cta")}
        </Button>
      ) : (
        <p className="text-muted-foreground text-sm" role="status">
          {t("rentedOut")}
        </p>
      )}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
};
