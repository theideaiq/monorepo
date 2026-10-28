"use client";

import { useAuth } from "@repo/auth/provider";
import {
  formatPrice,
  HOUSE_SELLER_ID,
  liveVariants,
  localized,
  variantName,
  variantSlug,
} from "@repo/commerce";
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
import { RentCard } from "@/components/store/rent-card";
import { WishlistButton } from "@/components/store/wishlist-button";
import { pickVariant, variantForDeepLink } from "@/lib/app-product";
import { type Box, type BoxTheme, boxThemes, themeReady } from "@/lib/boxes";
import { MAX_QUANTITY } from "@/lib/cart";
import { useAddToCart } from "@/lib/store-queries";
import { Price } from "./price";

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

/** A box's themes: the customer picks one, and staff pack the box to it. */
const ThemePicker = ({
  onPick,
  themes,
  value,
}: {
  readonly onPick: (id: string) => void;
  readonly themes: readonly BoxTheme[];
  readonly value: string | null;
}) => {
  const t = useTranslations("web.store.product.box");
  const locale = useLocale();
  if (themes.length === 0) {
    return null;
  }
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-medium text-sm">{t("theme")}</legend>
      <div className="flex flex-wrap gap-2">
        {themes.map((theme) => (
          <button
            aria-pressed={theme.id === value}
            className={cn(
              "rounded-md border px-3 py-2 text-start text-sm transition-colors",
              theme.id === value
                ? "border-primary bg-primary/10"
                : "hover:bg-accent"
            )}
            key={theme.id}
            onClick={() => onPick(theme.id)}
            type="button"
          >
            {localized(theme, "name", locale)}
          </button>
        ))}
      </div>
      {value ? null : (
        <p className="text-muted-foreground text-xs">{t("pickTheme")}</p>
      )}
    </fieldset>
  );
};

type Condition = ProductDetail["condition"];

/** One offer: copies in a condition from a seller. */
interface OfferChoice {
  condition: Condition;
  sellerId: string;
}

const sameOffer = (offer: ProductOffer, choice: OfferChoice) =>
  offer.condition === choice.condition && offer.seller_id === choice.sellerId;

interface OfferPickerProps {
  readonly offers: readonly ProductOffer[];
  readonly onPick: (choice: OfferChoice) => void;
  readonly value: OfferChoice;
}

/**
 * New, open box, refurbished or used, from The IDEA or a shop: each with
 * its price and copies left.
 */
const OfferPicker = ({ offers, onPick, value }: OfferPickerProps) => {
  const t = useTranslations("app.store.product");
  const conditions = useTranslations("store.condition");
  const locale = useLocale();
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-medium text-sm">{t("condition")}</legend>
      <div className="flex flex-wrap gap-2">
        {offers.map((offer) => (
          <button
            aria-pressed={sameOffer(offer, value)}
            className={cn(
              "grid rounded-md border px-3 py-2 text-start text-sm transition-colors",
              sameOffer(offer, value)
                ? "border-primary bg-primary/10"
                : "hover:bg-accent"
            )}
            key={`${offer.condition}-${offer.seller_id}`}
            onClick={() =>
              onPick({ condition: offer.condition, sellerId: offer.seller_id })
            }
            type="button"
          >
            <span className="font-medium">{conditions(offer.condition)}</span>
            {offer.seller_id === HOUSE_SELLER_ID ? null : (
              <span className="text-xs">
                {t("soldBy", { seller: offer.seller_name })}
              </span>
            )}
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

/**
 * The chosen variant's offers for sale, and the price and copies of the
 * chosen one (the variant's own when it is The IDEA's in the product's
 * condition).
 */
const offerSelection = (
  offers: readonly ProductOffer[],
  product: ProductDetail,
  selection: ReturnType<typeof pickVariant>,
  picked: OfferChoice
) => {
  const forSale = offers.filter(
    (offer) =>
      offer.purpose === "sale" && offer.variant_id === selection.variant?.id
  );
  const [only] = forSale;
  // The IDEA's copies in the product's condition until another is picked,
  // or the first offer when there are none of those.
  const chosen = forSale.find((offer) => sameOffer(offer, picked)) ?? only;
  const choice = chosen
    ? { condition: chosen.condition, sellerId: chosen.seller_id }
    : picked;
  const otherCondition = choice.condition !== product.condition;
  const otherOffer = otherCondition || choice.sellerId !== HOUSE_SELLER_ID;
  return {
    choice,
    forSale,
    otherCondition,
    price: otherOffer ? (chosen?.price ?? selection.price) : selection.price,
    showConditions:
      forSale.length > 1 ||
      (only !== undefined &&
        (only.condition !== product.condition ||
          only.seller_id !== HOUSE_SELLER_ID)),
    // Without offers (not loaded), the variant's or product's count.
    stock: offers.length > 0 ? (chosen?.available ?? 0) : selection.stock,
  };
};

/** Copies free to rent of a version (or of the item, without versions). */
const rentableCopies = (
  offers: readonly ProductOffer[],
  variantId: string | null
) =>
  offers
    .filter(
      (offer) =>
        offer.purpose === "rental" &&
        (variantId === null || offer.variant_id === variantId)
    )
    .reduce((sum, offer) => sum + offer.available, 0);

/** Rental items: rented with The IDEA Plus or on their own, not bought. */
const RentPanel = ({
  offers,
  product,
}: {
  readonly offers: readonly ProductOffer[];
  readonly product: ProductDetail;
}) => {
  const t = useTranslations("app.store.product");
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-md border p-4">
        <p className="text-sm">{t("rentalOnly")}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="plus">
            <Link href="/plus">{t("goToPlus")}</Link>
          </Button>
          <WishlistButton productId={product.id} withLabel />
        </div>
      </div>
      <RentCard
        available={rentableCopies(offers, null)}
        productId={product.id}
        slug={product.slug}
        variantId={null}
      />
    </div>
  );
};

/** For sale and for rent: renting on its own, or with The IDEA Plus. */
const AlsoRent = ({
  offers,
  product,
  variant,
}: {
  readonly offers: readonly ProductOffer[];
  readonly product: ProductDetail;
  readonly variant: ProductDetail["product_variants"][number] | null;
}) => {
  const t = useTranslations("app.store.product");
  if (!offers.some((offer) => offer.purpose === "rental")) {
    return null;
  }
  const versions = liveVariants(product.product_variants).length > 1;
  return (
    <>
      <RentCard
        available={rentableCopies(offers, variant?.id ?? null)}
        productId={product.id}
        slug={product.slug}
        variant={variant && versions ? variantSlug(variant) : null}
        variantId={variant?.id ?? null}
      />
      <p className="text-sm">
        <Link className="font-medium text-plus hover:underline" href="/plus">
          {t("alsoRent")}
        </Link>
      </p>
    </>
  );
};

/**
 * Buying on the product page: option, quantity, add to cart and the
 * wishlist. The cart is the signed-in customer's: adding while signed out
 * goes to the sign-in first.
 */
export const PurchasePanel = ({
  box = null,
  offers = [],
  product,
}: {
  /** The box's parts and themes, when the product is a box. */
  readonly box?: Box | null;
  /** The copies on offer (product_offers); empty when unknown. */
  readonly offers?: readonly ProductOffer[];
  readonly product: ProductDetail;
}) => {
  const t = useTranslations("app.store.product");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkAdd = searchParams.get("add") === "1";
  const add = useAddToCart();
  const { loading, user } = useAuth();
  // `?variant=vinyl` opens the page on that version.
  const [variantId, setVariantId] = useState<string | null>(() => {
    const wanted = searchParams.get("variant");
    const linked = wanted
      ? liveVariants(product.product_variants).find(
          (variant) => variantSlug(variant) === wanted
        )
      : undefined;
    return (linked ?? variantForDeepLink(product.product_variants))?.id ?? null;
  });
  const pickVariantId = (id: string) => {
    setVariantId(id);
    setQuantity(1);
    const picked = product.product_variants.find(
      (variant) => variant.id === id
    );
    if (picked) {
      // The address names the chosen version, so it can be shared.
      window.history.replaceState(
        null,
        "",
        `?variant=${encodeURIComponent(variantSlug(picked))}`
      );
    }
  };
  const [pickedOffer, setChoice] = useState<OfferChoice>({
    condition: product.condition,
    sellerId: HOUSE_SELLER_ID,
  });
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const themes = boxThemes(box);
  const [themeId, setThemeId] = useState<string | null>(null);
  const autoAdded = useRef(false);

  const selection = pickVariant(product, variantId);
  const { choice, forSale, otherCondition, price, showConditions, stock } =
    offerSelection(offers, product, selection, pickedOffer);
  const { condition } = choice;
  const chosenVariant = selection.variant;
  const canAdd =
    product.kind === "sale" &&
    product.status === "active" &&
    chosenVariant !== null &&
    stock > 0 &&
    themeReady(themes, themeId);

  const addToCart = (amount: number) => {
    if (!chosenVariant) {
      return;
    }
    if (!user) {
      // Sign in first; the link adds one copy (of the chosen version) on
      // the way back.
      router.push({
        pathname: "/sign-in",
        query: {
          return_to: `${localePath(locale, productHref(product.slug))}?variant=${encodeURIComponent(variantSlug(chosenVariant))}&add=1`,
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
          variant: variantName(chosenVariant, "en") || undefined,
        },
        boxThemeId: themeId,
        condition: otherCondition ? condition : null,
        productId: product.id,
        quantity: amount,
        sellerId: choice.sellerId,
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
    router.replace(
      chosenVariant && liveVariants(product.product_variants).length > 1
        ? `${productHref(product.slug)}?variant=${encodeURIComponent(variantSlug(chosenVariant))}`
        : productHref(product.slug)
    );
  }, [deepLinkAdd, loading]);

  if (product.kind === "rental") {
    return <RentPanel offers={offers} product={product} />;
  }

  return (
    <div className="grid gap-4">
      <ThemePicker onPick={setThemeId} themes={themes} value={themeId} />
      {showConditions ? (
        <OfferPicker
          offers={forSale}
          onPick={(offer) => {
            setChoice(offer);
            setQuantity(1);
          }}
          value={choice}
        />
      ) : null}
      {liveVariants(product.product_variants).length > 1 ? (
        <>
          <VariantPicker
            onPick={pickVariantId}
            product={product}
            ready={selection.ready}
            variantId={variantId}
          />
          {chosenVariant ? (
            <Price
              className="text-lg"
              compareAtPrice={
                otherCondition ? null : chosenVariant.compare_at_price
              }
              price={price}
            />
          ) : null}
        </>
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
      <AlsoRent offers={offers} product={product} variant={chosenVariant} />
    </div>
  );
};
