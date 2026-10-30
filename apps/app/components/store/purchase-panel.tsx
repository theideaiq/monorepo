"use client";

import { useAuth } from "@repo/auth/provider";
import {
  bulbsToEarn,
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
import {
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { CheckIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { productHref } from "@/components/store/product-card";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { WishlistButton } from "@/components/store/wishlist-button";
import { pickVariant, variantForDeepLink } from "@/lib/app-product";
import { minimumBid, useProductAuctions } from "@/lib/auctions";
import { useBulbRules, useMyBulbs } from "@/lib/bulbs-queries";
import { MAX_QUANTITY } from "@/lib/cart";
import { useAddToCart, useMemberPrices } from "@/lib/store-queries";
import { EndsIn } from "./auctions";
import { MakeOffer } from "./make-offer";
import { NotifyMe } from "./notify-me";
import { type Primary, usePlusWay } from "./plus-way";

type Condition = ProductDetail["condition"];
type Selection = ReturnType<
  typeof pickVariant<ProductDetail["product_variants"][number]>
>;
type Way = "auction" | "new" | "plus" | "used";

/** One offer: copies in a condition from a seller. */
interface OfferChoice {
  condition: Condition;
  sellerId: string;
}

const sameOffer = (offer: ProductOffer, choice: OfferChoice | null) =>
  choice !== null &&
  offer.condition === choice.condition &&
  offer.seller_id === choice.sellerId;

/**
 * The copies for sale of the chosen version, new apart from pre-owned
 * (open box, refurbished, used). Without any offer (not loaded), the
 * product's own listing at the version's price and stock.
 */
export const splitOffers = (
  offers: readonly ProductOffer[],
  product: Pick<ProductDetail, "condition">,
  variant: { id: string; price: number; stock_count: number } | null,
  fallback: { price: number; stock: number }
) => {
  const forSale = offers.filter(
    (offer) =>
      offer.purpose === "sale" &&
      (variant === null || offer.variant_id === variant.id) &&
      offer.available > 0
  );
  const loaded = offers.length !== 0;
  const nothingLeft = fallback.stock < 1;
  const listed: ProductOffer[] =
    loaded || nothingLeft
      ? forSale
      : [
          {
            available: fallback.stock,
            condition: product.condition,
            deals: [],
            lowest_30d: null,
            plus_price: null,
            price: fallback.price,
            purpose: "sale",
            sale_ends_at: null,
            seller_id: HOUSE_SELLER_ID,
            seller_name: "",
            student_price: null,
            variant_id: variant?.id ?? null,
            was_price: null,
          },
        ];
  const cheapest = (rows: ProductOffer[]) =>
    [...rows].sort(
      (a, b) =>
        (a.price ?? Number.POSITIVE_INFINITY) -
        (b.price ?? Number.POSITIVE_INFINITY)
    );
  return {
    fresh: cheapest(listed.filter((offer) => offer.condition === "new")),
    preOwned: cheapest(listed.filter((offer) => offer.condition !== "new")),
  };
};

/** What a line costs: The IDEA's own listing at the version's price. */
const linePrice = (
  offer: ProductOffer,
  product: Pick<ProductDetail, "condition">,
  variantPrice: number
) =>
  offer.condition === product.condition && offer.seller_id === HOUSE_SELLER_ID
    ? variantPrice
    : (offer.price ?? variantPrice);

const VariantPicker = ({
  onPick,
  product,
  variantId,
}: {
  readonly onPick: (id: string) => void;
  readonly product: ProductDetail;
  readonly variantId: string | null;
}) => {
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
              "min-h-11 rounded-md border px-3 py-2 text-start text-sm transition-colors",
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
      {variantId ? null : (
        <p className="text-muted-foreground text-xs">{t("chooseOption")}</p>
      )}
    </fieldset>
  );
};

/** The pre-owned copies, from The IDEA and shops: choose one. */
const CopyPicker = ({
  offers,
  onPick,
  value,
}: {
  readonly offers: readonly ProductOffer[];
  readonly onPick: (choice: OfferChoice) => void;
  readonly value: OfferChoice | null;
}) => {
  const t = useTranslations("app.store.product");
  const tGet = useTranslations("app.store.getIt");
  const conditions = useTranslations("store.condition");
  const locale = useLocale();
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-medium text-sm">{tGet("copies")}</legend>
      <ul className="grid gap-2">
        {offers.map((offer) => (
          <li key={`${offer.condition}-${offer.seller_id}`}>
            <button
              aria-pressed={sameOffer(offer, value)}
              className={cn(
                "grid min-h-11 w-full gap-0.5 rounded-md border px-3 py-2 text-start text-sm transition-colors",
                sameOffer(offer, value)
                  ? "border-primary bg-primary/10"
                  : "hover:bg-accent"
              )}
              onClick={() =>
                onPick({
                  condition: offer.condition,
                  sellerId: offer.seller_id,
                })
              }
              type="button"
            >
              <span className="flex justify-between gap-2">
                <span className="font-medium">
                  {conditions(offer.condition)}
                </span>
                <span className="font-mono">
                  {offer.price === null
                    ? null
                    : formatPrice(offer.price, locale)}
                </span>
              </span>
              <span className="text-muted-foreground text-xs">
                {offer.seller_id === HOUSE_SELLER_ID
                  ? null
                  : `${t("soldBy", { seller: offer.seller_name })} · `}
                {t("left", { count: formatNumber(offer.available, locale) })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
};

/**
 * "Student price" (verified students) and "Plus price" (Plus members): the
 * listing's lower prices they pay at checkout, the lower of the two when
 * both apply. Never struck through against the price.
 */
const MemberPriceNote = ({
  listing,
  productId,
}: {
  readonly listing: ProductOffer | null;
  readonly productId: string;
}) => {
  const t = useTranslations("app.store.product");
  const locale = useLocale();
  const { plus, student } = useMemberPrices(productId, listing);
  if (plus !== null && (student === null || plus < student)) {
    return (
      <p className="font-medium text-sm">
        {t("plusPrice", { price: formatPrice(plus, locale) })}
      </p>
    );
  }
  if (student === null) {
    return null;
  }
  return (
    <p className="font-medium text-sm">
      {t("studentPrice", { price: formatPrice(student, locale) })}
    </p>
  );
};

/**
 * "Earn 195 Bulbs": what the price earns once delivered, at the member's
 * rate (the store's when signed out). Under the price on the product page.
 */
export const EarnNote = ({ price }: { readonly price: number }) => {
  const t = useTranslations("app.store.product");
  const locale = useLocale();
  const mine = useMyBulbs().data?.rate;
  const store = useBulbRules().data?.rate;
  const rate = mine ?? store;
  const bulbs = rate === undefined ? 0 : bulbsToEarn(price, Number(rate));
  if (bulbs <= 0) {
    return null;
  }
  return (
    <p className="text-muted-foreground text-sm">
      {t("earnBulbs", { bulbs: formatNumber(bulbs, locale) })}
    </p>
  );
};

/** One way to get it, as a radio row: its name, then its terms. */
const WayRow = ({
  checked,
  children,
  onSelect,
  title,
}: {
  readonly checked: boolean;
  readonly children?: ReactNode;
  readonly onSelect: () => void;
  readonly title: string;
}) => (
  // biome-ignore lint/a11y/useSemanticElements: a row with several lines of terms, not a bare input
  <div
    aria-checked={checked}
    className={cn(
      "grid min-h-11 cursor-pointer gap-1 rounded-lg border p-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
      checked ? "border-primary bg-primary/5" : "hover:bg-accent"
    )}
    onClick={onSelect}
    onKeyDown={(event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        onSelect();
      }
    }}
    role="radio"
    tabIndex={0}
  >
    <span className="flex items-center gap-2 font-medium text-sm">
      <span
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 rounded-full border-2",
          checked ? "border-primary bg-primary" : "border-border-strong"
        )}
      />
      {title}
    </span>
    {children ? (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 ps-6">
        {children}
      </span>
    ) : null}
  </div>
);

/** The pink primary: a link or a button, keeping its label while busy. */
export const PrimaryAction = ({
  className,
  primary,
}: {
  readonly className?: string;
  readonly primary: Primary;
}) =>
  primary.href ? (
    <Button asChild className={className} size="lg">
      <Link href={primary.href}>{primary.label}</Link>
    </Button>
  ) : (
    <Button
      aria-busy={primary.busy}
      className={className}
      disabled={primary.disabled || primary.busy}
      onClick={primary.onClick}
      size="lg"
    >
      {primary.label}
    </Button>
  );

/** The ways to buy: new and pre-owned copies, of the chosen version. */
const buyOffers = (
  offers: readonly ProductOffer[],
  product: ProductDetail,
  selection: Selection
) => {
  if (!(product.kind === "sale" && product.status === "active")) {
    return { all: { fresh: [], preOwned: [] }, fresh: [], preOwned: [] };
  }
  const chosen = splitOffers(offers, product, selection.variant, {
    price: selection.price,
    stock: selection.stock,
  });
  // Before a version is chosen, the ways a product has at all.
  const all =
    liveVariants(product.product_variants).length > 1
      ? splitOffers(offers, product, null, {
          price: product.price,
          stock: product.stock_count,
        })
      : chosen;
  return { all, ...chosen };
};

/** The copy a buy goes to: the cheapest new one, or the pre-owned one chosen. */
const buyTarget = (
  way: Way | null,
  { fresh, preOwned }: { fresh: ProductOffer[]; preOwned: ProductOffer[] },
  copy: OfferChoice | null
) => {
  if (way === "new") {
    return fresh[0];
  }
  if (way !== "used") {
    return;
  }
  return (
    preOwned.find((row) => sameOffer(row, copy)) ??
    (preOwned.length === 1 ? preOwned[0] : undefined)
  );
};

/** The ways listed, in order, then the one chosen (the first by default). */
const listWays = (
  buy: ReturnType<typeof buyOffers>,
  plus: boolean,
  auction: boolean,
  chosen: Way | null
) => {
  const ways: Way[] = [
    ...(buy.all.fresh.length > 0 ? (["new"] as const) : []),
    ...(buy.all.preOwned.length > 0 ? (["used"] as const) : []),
    ...(plus ? (["plus"] as const) : []),
    ...(auction ? (["auction"] as const) : []),
  ];
  return {
    way: chosen && ways.includes(chosen) ? chosen : (ways[0] ?? null),
    ways,
  };
};

type Auction = NonNullable<
  ReturnType<typeof useProductAuctions>["data"]
>[number];

/** The radio rows, one per way, each with its terms. */
const WayList = ({
  auction,
  buy,
  onSelect,
  plus,
  product,
  variantPrice,
  way,
  ways,
}: {
  readonly auction: Auction | undefined;
  readonly buy: ReturnType<typeof buyOffers>;
  readonly onSelect: (way: Way) => void;
  readonly plus: ReturnType<typeof usePlusWay>;
  readonly product: ProductDetail;
  readonly variantPrice: number;
  readonly way: Way | null;
  readonly ways: readonly Way[];
}) => {
  const tGet = useTranslations("app.store.getIt");
  const conditions = useTranslations("store.condition");
  const locale = useLocale();
  const [freshFrom] = buy.all.fresh;
  const used = buy.all.preOwned;
  const row = (id: Way, title: string, terms: ReactNode) =>
    ways.includes(id) ? (
      <WayRow
        checked={way === id}
        key={id}
        onSelect={() => onSelect(id)}
        title={title}
      >
        {terms}
      </WayRow>
    ) : null;
  return (
    <div aria-labelledby="get-it" className="grid gap-2" role="radiogroup">
      {row(
        "new",
        tGet("new"),
        freshFrom ? (
          <span className="font-mono text-sm">
            {formatPrice(linePrice(freshFrom, product, variantPrice), locale)}
          </span>
        ) : null
      )}
      {row(
        "used",
        tGet("used"),
        <>
          <span className="text-sm">
            {tGet.rich("usedFrom", {
              amount: (chunks) => <span className="font-mono">{chunks}</span>,
              price: formatPrice(used[0]?.price ?? 0, locale),
            })}
          </span>
          <span className="text-muted-foreground text-xs">
            {tGet("offers", {
              count: used.length,
              n: formatNumber(used.length, locale),
            })}
          </span>
        </>
      )}
      {plus ? row("plus", plus.title, plus.detail) : null}
      {auction
        ? row(
            "auction",
            tGet("auction"),
            <span className="text-sm">
              {conditions(auction.condition)} · {tGet("endsIn")}{" "}
              <EndsIn endsAt={auction.ends_at} />
            </span>
          )
        : null}
    </div>
  );
};

/** A copy's terms: sale end, quantity deals, the shop, member prices. */
const CopyTerms = ({
  offer,
  productId,
}: {
  readonly offer: ProductOffer;
  readonly productId: string;
}) => {
  const t = useTranslations("app.store.product");
  const locale = useLocale();
  return (
    <>
      {offer.sale_ends_at ? (
        <p className="font-medium text-pink-text text-sm">
          {t("saleEnds", { time: formatDateTime(offer.sale_ends_at, locale) })}
        </p>
      ) : null}
      {offer.deals.map((deal) => (
        <p className="text-sm" key={deal.min_quantity}>
          {t("quantityDeal", {
            from: formatNumber(deal.min_quantity, locale),
            rate: formatNumber(deal.discount_rate, locale),
          })}
        </p>
      ))}
      {offer.seller_id === HOUSE_SELLER_ID ? null : (
        <Link
          className="text-sm hover:underline"
          href={`/store/shops/${offer.seller_id}`}
        >
          {t("soldBy", { seller: offer.seller_name })}
        </Link>
      )}
      <MemberPriceNote listing={offer} productId={productId} />
    </>
  );
};

/** "Added to your cart. View cart", or why it couldn't be added. */
const AddedNote = ({
  added,
  failed,
}: {
  readonly added: boolean;
  readonly failed: boolean;
}) => {
  const t = useTranslations("app.store.product");
  return (
    <>
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
      {failed ? (
        <p className="text-destructive text-sm" role="alert">
          {t("addFailed")}
        </p>
      ) : null}
    </>
  );
};

/** Save and the primary: at the panel's end on wide screens, docked on phones. */
const Actions = ({
  primary,
  productId,
}: {
  readonly primary: Primary | null;
  readonly productId: string;
}) => (
  <>
    <div className="hidden gap-2 md:flex">
      <WishlistButton productId={productId} withLabel />
      {primary ? <PrimaryAction className="flex-1" primary={primary} /> : null}
    </div>
    {/* Phones: Save at the start, the one primary at the end. */}
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t bg-background/95 p-3 backdrop-blur md:hidden">
      <WishlistButton productId={productId} withLabel />
      {primary ? <PrimaryAction className="flex-1" primary={primary} /> : null}
    </div>
  </>
);

/**
 * Make an offer under a copy whose seller takes offers; Notify me when
 * nobody has it on offer.
 */
const OfferOrNotify = ({
  buy,
  offer,
  price,
  product,
  variantId,
}: {
  readonly buy: ReturnType<typeof buyOffers>;
  readonly offer: ProductOffer | undefined;
  readonly price: number;
  readonly product: ProductDetail;
  readonly variantId: string | null;
}) => {
  if (offer) {
    return (
      <MakeOffer
        condition={offer.condition}
        price={price}
        productId={product.id}
        sellerId={offer.seller_id}
        slug={product.slug}
        variantId={variantId}
      />
    );
  }
  const nothing = buy.all.fresh.length + buy.all.preOwned.length === 0;
  return product.status === "active" && nothing ? (
    <NotifyMe productId={product.id} slug={product.slug} />
  ) : null;
};

/** The address names the chosen version, so it can be shared. */
const showVariantInAddress = (product: ProductDetail, id: string) => {
  const picked = product.product_variants.find((variant) => variant.id === id);
  if (picked) {
    window.history.replaceState(
      null,
      "",
      `?variant=${encodeURIComponent(variantSlug(picked))}`
    );
  }
};

/** The variant chosen from `?variant=…`, or the only one. */
const linkedVariant = (product: ProductDetail, wanted: string | null) => {
  const linked = wanted
    ? liveVariants(product.product_variants).find(
        (variant) => variantSlug(variant) === wanted
      )
    : undefined;
  return (linked ?? variantForDeepLink(product.product_variants))?.id ?? null;
};

/**
 * Adding to the cart: signed out, sign in first (the link adds one copy of
 * the chosen version on the way back). `?add=1` (notifications, after
 * signing in) adds one copy once when no choice is needed, then is dropped.
 */
const useBuy = (
  product: ProductDetail,
  selection: Selection,
  buy: ReturnType<typeof buyOffers>
) => {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkAdd = searchParams.get("add") === "1";
  const add = useAddToCart();
  const { loading, user } = useAuth();
  const [added, setAdded] = useState(false);
  const autoAdded = useRef(false);
  const chosenVariant = selection.variant;

  const addToCart = (amount: number, target: ProductOffer | undefined) => {
    if (!(chosenVariant && target)) {
      return;
    }
    if (!user) {
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
          price: linePrice(target, product, selection.price),
          variant: variantName(chosenVariant, "en") || undefined,
        },
        condition:
          target.condition === product.condition ? null : target.condition,
        productId: product.id,
        quantity: amount,
        sellerId: target.seller_id,
        variantId: chosenVariant.id,
      },
      { onSuccess: () => setAdded(true) }
    );
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per deep link, after the session loads
  useEffect(() => {
    if (!deepLinkAdd || loading || autoAdded.current) {
      return;
    }
    autoAdded.current = true;
    const target =
      buy.fresh[0] ?? (buy.preOwned.length === 1 ? buy.preOwned[0] : undefined);
    if (user) {
      addToCart(1, target);
    }
    const versions = liveVariants(product.product_variants).length > 1;
    router.replace(
      chosenVariant && versions
        ? `${productHref(product.slug)}?variant=${encodeURIComponent(variantSlug(chosenVariant))}`
        : productHref(product.slug)
    );
  }, [deepLinkAdd, loading]);

  return { add, added, addToCart, sessionLoading: loading };
};

/**
 * The product page's "Get it" panel: every way to have it, in order (Buy
 * new · Buy used or open box · Plus · Auction), each with its terms, and
 * Make an offer under a copy that takes offers. Choosing a way sets the
 * one pink button ("Add to cart · 69,750", "Choose a copy", "Add to
 * queue", "Join Plus to play", "Bid 125,000"): at the panel's end on wide
 * screens, in the bottom dock on phones, with Save before it.
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
  const tGet = useTranslations("app.store.getIt");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const plus = usePlusWay(product);
  const auction = useProductAuctions(product.id).data?.[0];
  const [variantId, setVariantId] = useState<string | null>(() =>
    linkedVariant(product, searchParams.get("variant"))
  );
  const [chosenWay, setWay] = useState<Way | null>(null);
  const [copy, setCopy] = useState<OfferChoice | null>(null);
  const [quantity, setQuantity] = useState(1);

  const selection = pickVariant(product, variantId);
  const versions = liveVariants(product.product_variants).length > 1;
  const buy = buyOffers(offers, product, selection);
  const { way, ways } = listWays(
    buy,
    plus !== null,
    Boolean(auction),
    chosenWay
  );
  const buying = way === "new" || way === "used";
  const offer = buyTarget(way, buy, copy);
  const price = offer ? linePrice(offer, product, selection.price) : 0;
  const canAdd = selection.variant !== null && offer !== undefined;
  const { add, added, addToCart, sessionLoading } = useBuy(
    product,
    selection,
    buy
  );

  const pickVariantId = (id: string) => {
    setVariantId(id);
    setQuantity(1);
    setCopy(null);
    showVariantInAddress(product, id);
  };

  const bid = auction
    ? {
        href: `/store/auctions/${auction.number}`,
        label: tGet("bid", { price: formatPrice(minimumBid(auction), locale) }),
      }
    : null;
  const others: Partial<Record<Way, Primary | null>> = {
    auction: bid,
    plus: plus?.primary ?? null,
  };
  const primary = buying
    ? buyPrimary({
        // Until the session loads, a signed-in shopper would look signed out
        // and be sent to sign in.
        busy: add.isPending || sessionLoading,
        canAdd,
        label: (key, values) => tGet(key, values),
        onAdd: () => addToCart(quantity, offer),
        price: formatPrice(price * quantity, locale),
        versionMissing: versions && !selection.variant,
        way,
      })
    : (others[way ?? "new"] ?? null);

  return (
    <>
      <section
        aria-labelledby="get-it"
        className="grid gap-4 rounded-2xl border bg-card p-4 shadow-1"
      >
        <h2 className="font-semibold text-lg" id="get-it">
          {tGet("title")}
        </h2>
        {ways.length > 0 ? (
          <WayList
            auction={auction}
            buy={buy}
            onSelect={setWay}
            plus={plus}
            product={product}
            variantPrice={selection.price}
            way={way}
            ways={ways}
          />
        ) : null}
        {buying && versions ? (
          <VariantPicker
            onPick={pickVariantId}
            product={product}
            variantId={variantId}
          />
        ) : null}
        {way === "used" && buy.preOwned.length > 1 ? (
          <CopyPicker
            offers={buy.preOwned}
            onPick={(choice) => {
              setCopy(choice);
              setQuantity(1);
            }}
            value={copy}
          />
        ) : null}
        {buying && offer ? (
          <div className="grid gap-2">
            <CopyTerms offer={offer} productId={product.id} />
            <QuantityStepper
              decreaseLabel={t("decrease")}
              disabled={!canAdd}
              increaseLabel={t("increase")}
              label={t("quantity")}
              max={Math.max(1, Math.min(offer.available, MAX_QUANTITY))}
              onChange={setQuantity}
              value={quantity}
            />
          </div>
        ) : null}
        <Actions primary={primary} productId={product.id} />
        <AddedNote added={added} failed={add.isError} />
        <OfferOrNotify
          buy={buy}
          offer={canAdd ? offer : undefined}
          price={price}
          product={product}
          variantId={selection.variant?.id ?? null}
        />
      </section>
      <div aria-hidden="true" className="h-20 md:hidden" />
    </>
  );
};

/** The primary for a buy: Add to cart · price, or what's still missing. */
const buyPrimary = ({
  busy,
  canAdd,
  label,
  onAdd,
  price,
  versionMissing,
  way,
}: {
  busy: boolean;
  canAdd: boolean;
  label: (
    key: "addToCart" | "chooseCopy" | "chooseOption" | "soldOut",
    values?: { price: string }
  ) => string;
  onAdd: () => void;
  price: string;
  versionMissing: boolean;
  way: Way | null;
}): Primary => {
  if (versionMissing) {
    return { disabled: true, label: label("chooseOption") };
  }
  if (canAdd) {
    return { busy, label: label("addToCart", { price }), onClick: onAdd };
  }
  return {
    disabled: true,
    label: label(way === "used" ? "chooseCopy" : "soldOut"),
  };
};
