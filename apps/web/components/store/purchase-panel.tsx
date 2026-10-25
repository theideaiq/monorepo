"use client";

import { useAuth } from "@repo/auth/provider";
import { describeAttributes, localized } from "@repo/commerce";
import type { ProductDetail } from "@repo/commerce/catalog";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { CheckIcon, ShoppingCartIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { productHref } from "@/components/store/product-card";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { WishlistButton } from "@/components/store/wishlist-button";
import { pickVariant, variantForDeepLink } from "@/lib/app-product";
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
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-medium text-sm">{t("options")}</legend>
      <div className="flex flex-wrap gap-2">
        {product.product_variants.map((variant) => (
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
            {describeAttributes(variant.attributes) || variant.sku}
          </button>
        ))}
      </div>
      {ready ? null : (
        <p className="text-muted-foreground text-xs">{t("chooseOption")}</p>
      )}
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
  product,
}: {
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
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const autoAdded = useRef(false);

  const selection = pickVariant(product, variantId);
  const canAdd =
    product.kind === "sale" &&
    product.status === "active" &&
    selection.ready &&
    selection.stock > 0;

  const addToCart = (amount: number) => {
    if (!user) {
      // Sign in first; the link adds one copy on the way back.
      router.push({
        pathname: "/sign-in",
        query: {
          return_to: `/${locale}${productHref(product.slug)}?add=1`,
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
          price: selection.price,
        },
        productId: product.id,
        quantity: amount,
        variantId: selection.variant?.id ?? null,
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
      {product.product_variants.length > 0 ? (
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
          max={Math.max(1, Math.min(selection.stock, MAX_QUANTITY))}
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
    </div>
  );
};
