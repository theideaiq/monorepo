"use client";

import { formatPrice, localized, planName, variantName } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  formatDate,
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import {
  GiftIcon,
  HeartIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { OrderSummary } from "@/components/store/order-summary";
import { productHref } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import {
  type AuctionLine,
  useCartAuctionLines,
  useRemoveCartAuction,
} from "@/lib/auctions";
import {
  addAuctionsToSummary,
  addKitToSummary,
  addPlusGiftToSummary,
  addProgramsToSummary,
  type CartLineView,
  freeDeliveryRemaining,
  isOtherCondition,
  isRentLine,
  isShopLine,
  lineProblem,
  MAX_QUANTITY,
  summarizeCart,
} from "@/lib/cart";
import { useCartKitLine, useRemoveCartKit } from "@/lib/kits";
import { useCartPlusGiftLine, useRemoveCartPlusGift } from "@/lib/plus-gifts";
import {
  type ProgramLine,
  useCartProgramLines,
  useRemoveCartProgram,
} from "@/lib/programs";
import {
  useCart,
  useDeliveryZones,
  useStoreSettings,
  useUpdateCartLine,
} from "@/lib/store-queries";
import { useMyStudent } from "@/lib/student-queries";
import { useSaveForLater } from "@/lib/wishlist-queries";

/** A rent line's terms: the days it's for and its refundable deposit. */
const RentTerms = ({ line }: { readonly line: CartLineView }) => {
  const t = useTranslations("app.cart.rent");
  const tRent = useTranslations("app.rent");
  const locale = useLocale();
  const days = line.item.rental?.days ?? 0;
  return (
    <span className="text-muted-foreground text-xs">
      {t("terms", {
        days: tRent("days", { count: days, n: formatNumber(days, locale) }),
        deposit: formatPrice(line.deposit, locale),
      })}
    </span>
  );
};

const CartLineRow = ({ line }: { readonly line: CartLineView }) => {
  const t = useTranslations("app.cart");
  const conditions = useTranslations("store.condition");
  const soldBy = useTranslations("app.store.product");
  const locale = useLocale();
  const update = useUpdateCartLine();
  const later = useSaveForLater();
  const { item } = line;
  const name = item.product ? localized(item.product, "name", locale) : "";
  const problem = lineProblem(line);
  const busy = update.isPending || later.isPending;

  return (
    <li className="flex gap-3 py-4">
      <Link
        className="w-20 shrink-0 sm:w-24"
        href={productHref(item.product?.slug ?? "")}
      >
        <ProductImage
          alt={name}
          path={item.variant?.images[0] ?? item.product?.images[0]}
          sizes="96px"
        />
      </Link>
      <div className="grid min-w-0 flex-1 gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 gap-0.5">
            <Link
              className="line-clamp-2 font-medium text-sm hover:underline"
              href={productHref(item.product?.slug ?? "")}
            >
              {name}
            </Link>
            {item.variant && variantName(item.variant, locale) ? (
              <span className="text-muted-foreground text-xs">
                {variantName(item.variant, locale)}
              </span>
            ) : null}
            {item.condition && isOtherCondition(item) ? (
              <span className="text-muted-foreground text-xs">
                {conditions(item.condition)}
              </span>
            ) : null}
            {isRentLine(item) ? <RentTerms line={line} /> : null}
            {isShopLine(item) && item.seller ? (
              <span className="text-muted-foreground text-xs">
                {soldBy("soldBy", { seller: item.seller.name })}
              </span>
            ) : null}
          </div>
          <span className="shrink-0 font-medium text-sm tabular-nums">
            {formatPrice(line.unitPrice * line.quantity, locale)}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {isRentLine(item) ? (
            <span className="font-medium text-pink-text text-xs">
              {t("rent.label")}
            </span>
          ) : (
            <QuantityStepper
              decreaseLabel={t("decrease")}
              disabled={busy || !line.buyable}
              increaseLabel={t("increase")}
              label={t("quantity")}
              max={Math.max(1, Math.min(line.available, MAX_QUANTITY))}
              onChange={(quantity) => update.mutate({ id: item.id, quantity })}
              value={line.quantity}
            />
          )}
          <div className="flex flex-wrap gap-1">
            {isRentLine(item) ? null : (
              <Button
                disabled={busy}
                onClick={() =>
                  later.mutate({
                    cartItemId: item.id,
                    productId: item.product_id,
                  })
                }
                size="sm"
                variant="ghost"
              >
                <HeartIcon />
                {t("saveForLater")}
              </Button>
            )}
            <Button
              disabled={busy}
              onClick={() => update.mutate({ id: item.id, quantity: 0 })}
              size="sm"
              variant="ghost"
            >
              <Trash2Icon />
              {t("remove")}
            </Button>
          </div>
        </div>
        {problem ? (
          <p className="text-destructive text-xs" role="alert">
            {problem === "notEnoughStock"
              ? t("notEnoughStock", {
                  count: formatNumber(line.available, locale),
                })
              : t(problem)}
          </p>
        ) : null}
        {update.isError ? (
          <p className="text-destructive text-xs" role="alert">
            {t("updateFailed")}
          </p>
        ) : null}
      </div>
    </li>
  );
};

type CartKitLine = NonNullable<ReturnType<typeof useCartKitLine>>;

/** The game night kit in the cart: its weekend, extra days and deposit. */
const KitRow = ({ kit }: { readonly kit: CartKitLine }) => {
  const t = useTranslations("app.cart.kit");
  const tCart = useTranslations("app.cart");
  const locale = useLocale();
  const remove = useRemoveCartKit();
  const name = kit.item.kit ? localized(kit.item.kit, "name", locale) : "";
  return (
    <li className="grid gap-2 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <span className="font-medium text-sm">{name}</span>
          <span className="text-muted-foreground text-xs">
            {t("when", {
              date: formatDate(kit.item.starts_on, locale),
              extra: formatNumber(kit.item.extra_days, locale),
              hasExtra: kit.item.extra_days > 0 ? "yes" : "no",
            })}
          </span>
          {kit.deposit > 0 ? (
            <span className="text-muted-foreground text-xs">
              {t("deposit", { deposit: formatPrice(kit.deposit, locale) })}
            </span>
          ) : null}
        </div>
        <span className="shrink-0 font-medium text-sm tabular-nums">
          {formatPrice(kit.price, locale)}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-pink-text text-xs">{t("label")}</span>
        <Button
          disabled={remove.isPending}
          onClick={() => remove.mutate(kit.item.id)}
          size="sm"
          variant="ghost"
        >
          <Trash2Icon />
          {tCart("remove")}
        </Button>
      </div>
      {kit.available ? null : (
        <p className="text-destructive text-xs" role="alert">
          {t("booked")}
        </p>
      )}
    </li>
  );
};

type CartPlusLine = NonNullable<ReturnType<typeof useCartPlusGiftLine>>;

/** Plus months in the cart: always sent as a gift. */
const PlusGiftRow = ({ plus }: { readonly plus: CartPlusLine }) => {
  const t = useTranslations("app.cart.plus");
  const tCart = useTranslations("app.cart");
  const locale = useLocale();
  const remove = useRemoveCartPlusGift();
  const { months, plan } = plus.item;
  return (
    <li className="grid gap-2 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <span className="font-medium text-sm">
            {plan ? planName(plan, locale) : ""}
          </span>
          <span className="text-muted-foreground text-xs">
            {t("months", {
              count: months,
              months: formatNumber(months, locale),
            })}
          </span>
        </div>
        <span className="shrink-0 font-medium text-sm tabular-nums">
          {formatPrice(plus.price, locale)}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-medium text-pink-text text-xs">
          <GiftIcon className="size-3.5" />
          {t("label")}
        </span>
        <Button
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
          size="sm"
          variant="ghost"
        >
          <Trash2Icon />
          {tCart("remove")}
        </Button>
      </div>
    </li>
  );
};

/** A program installment (or what's left) in the cart: paid online. */
const ProgramRow = ({ line }: { readonly line: ProgramLine }) => {
  const t = useTranslations("app.cart.program");
  const tCart = useTranslations("app.cart");
  const locale = useLocale();
  const remove = useRemoveCartProgram();
  const first = String(line.positions[0] ?? 1);
  const last = String(line.positions.at(-1) ?? 1);
  return (
    <li className="grid gap-2 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <span className="font-medium text-sm">
            {line.title ? localized(line.title, "title", locale) : ""}
          </span>
          <span className="text-muted-foreground text-xs">
            {line.total === 1
              ? t("full")
              : t(first === last ? "installment" : "installments", {
                  first,
                  last,
                  total: String(line.total),
                })}
          </span>
        </div>
        <span className="shrink-0 font-medium text-sm tabular-nums">
          {formatPrice(line.amount, locale)}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">{t("online")}</span>
        <Button
          disabled={remove.isPending}
          onClick={() => remove.mutate(line.applicationId)}
          size="sm"
          variant="ghost"
        >
          <Trash2Icon />
          {tCart("remove")}
        </Button>
      </div>
    </li>
  );
};

/** A won auction in the cart: paid online by its deadline. */
const AuctionRow = ({ line }: { readonly line: AuctionLine }) => {
  const t = useTranslations("app.cart.auction");
  const tCart = useTranslations("app.cart");
  const locale = useLocale();
  const remove = useRemoveCartAuction();
  return (
    <li className="grid gap-2 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <Link
            className="font-medium text-sm hover:underline"
            href={`/store/auctions/${line.number}`}
          >
            {line.name ? localized(line.name, "name", locale) : ""}
          </Link>
          <span className="text-muted-foreground text-xs">
            {line.payBy
              ? t("payBy", { time: formatDateTime(line.payBy, locale) })
              : t("won")}
          </span>
        </div>
        <span className="shrink-0 font-medium text-sm tabular-nums">
          {formatPrice(line.amount, locale)}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">{t("online")}</span>
        <Button
          disabled={remove.isPending}
          onClick={() => remove.mutate(line.auctionId)}
          size="sm"
          variant="ghost"
        >
          <Trash2Icon />
          {tCart("remove")}
        </Button>
      </div>
    </li>
  );
};

/** The cart's lines and kit, priced, and whether there's anything in it. */
const useCartSummary = (
  items: ReturnType<typeof useCart>["data"],
  settings: ReturnType<typeof useStoreSettings>["data"]
) => {
  const isStudent = useMyStudent().data?.verified ?? false;
  const kit = useCartKitLine(isStudent);
  const plus = useCartPlusGiftLine();
  const programs = useCartProgramLines();
  const auctions = useCartAuctionLines();
  const summary =
    items && settings
      ? addAuctionsToSummary(
          addProgramsToSummary(
            addPlusGiftToSummary(
              addKitToSummary(summarizeCart(items, settings), kit),
              plus
            ),
            programs
          ),
          auctions
        )
      : null;
  return {
    auctions,
    empty:
      summary !== null &&
      summary.lines.length === 0 &&
      !kit &&
      !plus &&
      programs.length === 0 &&
      auctions.length === 0,
    kit,
    plus,
    programs,
    summary,
  };
};

export const Cart = () => {
  const t = useTranslations("app.cart");
  const locale = useLocale();
  const cart = useCart();
  const settings = useStoreSettings();
  // Delivery in Baghdad is free from a threshold; the cart says how close.
  const baghdad = useDeliveryZones().data?.find(
    (zone) => zone.governorate === "baghdad"
  );

  const loading = cart.isPending || settings.isPending;
  const failed = cart.isError || settings.isError;
  const { auctions, empty, kit, plus, programs, summary } = useCartSummary(
    cart.data,
    settings.data
  );
  // Deposits, gifted Plus months and programs don't count towards free
  // delivery.
  const outside =
    (plus?.price ?? 0) + programs.reduce((sum, line) => sum + line.amount, 0);
  const remaining = summary
    ? freeDeliveryRemaining(
        summary.totals.subtotal - summary.totals.deposits - outside,
        baghdad?.free_from
      )
    : 0;

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex flex-1 flex-col gap-6">
        {loading && !failed ? <SectionSpinner /> : null}
        {failed ? (
          <ErrorState
            onRetry={() => {
              cart.refetch();
              settings.refetch();
            }}
          />
        ) : null}
        {empty ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShoppingCartIcon />
              </EmptyMedia>
              <EmptyTitle>{t("empty.title")}</EmptyTitle>
              <EmptyDescription>{t("empty.description")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/store">{t("empty.browse")}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}
        {summary && !empty ? (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
            <section className="grid gap-2">
              {summary.problems > 0 ? (
                <p
                  className="rounded-md bg-destructive/10 p-3 text-destructive text-sm"
                  role="alert"
                >
                  {t("problems")}
                </p>
              ) : null}
              <ul className="divide-y">
                {summary.lines.map((line) => (
                  <CartLineRow key={line.item.id} line={line} />
                ))}
                {kit ? <KitRow kit={kit} /> : null}
                {plus ? <PlusGiftRow plus={plus} /> : null}
                {programs.map((line) => (
                  <ProgramRow key={line.applicationId} line={line} />
                ))}
                {auctions.map((line) => (
                  <AuctionRow key={line.auctionId} line={line} />
                ))}
              </ul>
            </section>
            <Card className="lg:sticky lg:top-4">
              <CardHeader>
                <CardTitle>{t("summary")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <OrderSummary {...summary.totals} />
                {remaining > 0 ? (
                  <p className="text-muted-foreground text-xs">
                    {t("freeShippingHint", {
                      amount: formatPrice(remaining, locale),
                    })}
                  </p>
                ) : null}
                {summary.canCheckout ? (
                  <Button asChild size="lg">
                    <Link href="/checkout">{t("checkout")}</Link>
                  </Button>
                ) : (
                  <Button disabled size="lg">
                    {t("checkout")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </>
  );
};
