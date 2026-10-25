"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice, localized, variantName } from "@repo/commerce";
import type { ProductDetail, ProductOffer } from "@repo/commerce/catalog";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { localePath } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { CheckIcon, ShoppingCartIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { productHref } from "@/components/store/product-card";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { WishlistButton } from "@/components/store/wishlist-button";
import {
  liveVariants,
  pickVariant,
  variantForDeepLink,
} from "@/lib/app-product";
import { MAX_QUANTITY } from "@/lib/cart";
import { useAddToCart } from "@/lib/store-queries";

interface VariantPickerProps {
  readonly onPick: (id: string) => void;
  readonly product: ProductDetail;
  readonly ready: boolean;
  readonly variantId: string | null;
}

const VariantPicker = ({
  onPick,
  product,
  ready,
  variantId,
}: VariantPickerProps) => {
  const t = useTranslations("app.store.product");
  const locale = useLocale();
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-medium text-sm">{t("options")}</legend>
      <div className="flex flex-wrap gap-2">
        {liveVariants(product.product_variants).map((variant) => (
          <button
            aria-pressed={variant.id === variantId}
            className={cn(
              "rounded-md border px-3 py-2 text-start text-sm transition-colors",
              variant.id === variantId
                ? "border-primary bg-primary/10"
                : "hover:bg-accent",
              variant.stock_count <= 0 && "opacity-50"
            )}
            key={variant.id}
            onClick={() => onPick(variant.id)}
            type="button"
          >
            {variantName(variant, locale) || variant.sku}
          </button>
        ))}
      </div>
      {ready ? null : (
        <p className="text-muted-foreground text-xs">{t("chooseOption")}</p>
      )}
    </fieldset>
  );
};

type Condition = ProductDetail["condition"];

interface ConditionPickerProps {
  readonly offers: readonly ProductOffer[];
  readonly onPick: (condition: Condition) => void;
  readonly value: Condition;
}

/** New, open box, refurbished or used: each with its price and copies left. */
const ConditionPicker = ({ offers, onPick, value }: ConditionPickerProps) => {
  const t = useTranslations("app.store.product");
  const conditions = useTranslations("store.condition");
  const locale = useLocale();
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-medium text-sm">{t("condition")}</legend>
      <div className="flex flex-wrap gap-2">
        {offers.map((offer) => (
          <button
            aria-pressed={offer.condition === value}
            className={cn(
              "grid rounded-md border px-3 py-2 text-start text-sm transition-colors",
              offer.condition === value
                ? "border-primary bg-primary/10"
                : "hover:bg-accent"
            )}
            key={offer.condition}
            onClick={() => onPick(offer.condition)}
            type="button"
          >
            <span className="font-medium">{conditions(offer.condition)}</span>
            <span className="text-muted-foreground text-xs">
              {offer.price === null ? null : formatPrice(offer.price, locale)}
              {" · "}
              {t("left", { count: formatNumber(offer.available, locale) })}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
};

/** Rental items: rented with The IDEA Plus, not bought. */
const RentPanel = ({ productId }: { readonly productId: string }) => {
  const t = useTranslations("app.store.product");
  return (
    <div className="grid gap-3 rounded-md border p-4">
      <p className="text-sm">{t("rentalOnly")}</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="plus">
          <Link href="/plus">{t("goToPlus")}</Link>
        </Button>
        <WishlistButton productId={productId} withLabel />
      </div>
    </div>
  );
};

/**
 * Buying on the product page: option, quantity, add to cart and the
 * wishlist. The cart is the signed-in customer's: adding while signed out
 * goes to the sign-in first.
 */
export const PurchasePanel = ({
  offers = [],
  product,
}: {
  /** The copies on offer (product_offers); empty when unknown. */
  readonly offers?: readonly ProductOffer[];
  readonly product: ProductDetail;
}) => {
  const t = useTranslations("app.store.product");
  const locale = useLocale();
  const router = useRouter();
  const deepLinkAdd = useSearchParams().get("add") === "1";
  const add = useAddToCart();
  const { loading, user } = useAuth();
  const [variantId, setVariantId] = useState<string | null>(
    () => variantForDeepLink(product.product_variants)?.id ?? null
  );
  const [condition, setCondition] = useState<Condition>(product.condition);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const autoAdded = useRef(false);

  const selection = pickVariant(product, variantId);
  // Copies for sale of the chosen variant, by condition.
  const forSale = offers.filter(
    (offer) =>
      offer.purpose === "sale" && offer.variant_id === selection.variant?.id
  );
  const chosen = forSale.find((offer) => offer.condition === condition);
  const otherCondition = condition !== product.condition;
  const price = otherCondition
    ? (chosen?.price ?? selection.price)
    : selection.price;
  // Without offers (not loaded), the variant's or product's count.
  const stock = offers.length > 0 ? (chosen?.available ?? 0) : selection.stock;
  const showConditions =
    forSale.length > 1 ||
    (forSale.length === 1 && forSale[0]?.condition !== product.condition);
  const chosenVariant = selection.variant;
  const canAdd =
    product.kind === "sale" &&
    product.status === "active" &&
    chosenVariant !== null &&
    stock > 0;

  const addToCart = (amount: number) => {
    if (!chosenVariant) {
      return;
    }
    if (!user) {
      // Sign in first; the link adds one copy on the way back.
      router.push({
        pathname: "/sign-in",
        query: {
          return_to: `${localePath(locale, productHref(product.slug))}?add=1`,
        },
      });
      return;
    }
    setAdded(false);
    add.mutate(
      {
        analytics: {
          currency: product.currency,
          id: product.id,
          name: localized(product, "name", locale),
          price,
        },
        condition: otherCondition ? condition : null,
        productId: product.id,
        quantity: amount,
        variantId: chosenVariant.id,
      },
      { onSuccess: () => setAdded(true) }
    );
  };

  // Links such as "/store/<slug>?add=1" (notifications, after signing in):
  // add one copy once, when no choice is needed, then drop the flag.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per deep link, after the session loads
  useEffect(() => {
    if (!deepLinkAdd || loading || autoAdded.current) {
      return;
    }
    autoAdded.current = true;
    if (canAdd && user) {
      addToCart(1);
    }
    router.replace(productHref(product.slug));
  }, [deepLinkAdd, loading]);

  if (product.kind === "rental") {
    return <RentPanel productId={product.id} />;
  }

  return (
    <div className="grid gap-4">
      {showConditions ? (
        <ConditionPicker
          offers={forSale}
          onPick={(picked) => {
            setCondition(picked);
            setQuantity(1);
          }}
          value={condition}
        />
      ) : null}
      {liveVariants(product.product_variants).length > 1 ? (
        <VariantPicker
          onPick={(id) => {
            setVariantId(id);
            setQuantity(1);
          }}
          product={product}
          ready={selection.ready}
          variantId={variantId}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          decreaseLabel={t("decrease")}
          disabled={!canAdd}
          increaseLabel={t("increase")}
          label={t("quantity")}
          max={Math.max(1, Math.min(stock, MAX_QUANTITY))}
          onChange={setQuantity}
          value={quantity}
        />
        <Button
          disabled={!canAdd || add.isPending}
          onClick={() => addToCart(quantity)}
          size="lg"
        >
          <ShoppingCartIcon />
          {add.isPending ? t("adding") : t("addToCart")}
        </Button>
        <WishlistButton productId={product.id} withLabel />
      </div>
      {added ? (
        <p className="flex flex-wrap items-center gap-2 text-sm" role="status">
          <CheckIcon className="size-4 text-success" />
          {t("added")}
          <Link
            className="font-medium text-pink-text hover:underline"
            href="/cart"
          >
            {t("viewCart")}
          </Link>
        </p>
      ) : null}
      {add.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("addFailed")}
        </p>
      ) : null}
      {offers.some((offer) => offer.purpose === "rental") ? (
        <p className="text-sm">
          <Link className="font-medium text-plus hover:underline" href="/plus">
            {t("alsoRent")}
          </Link>
        </p>
      ) : null}
    </div>
  );
};
