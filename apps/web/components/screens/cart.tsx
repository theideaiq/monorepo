"use client";

import { formatPrice, localized, variantName } from "@repo/commerce";
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
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ShoppingCartIcon, Trash2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { OrderSummary } from "@/components/store/order-summary";
import { productHref } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import {
  type CartLineView,
  freeDeliveryRemaining,
  isOtherCondition,
  lineProblem,
  MAX_QUANTITY,
  summarizeCart,
} from "@/lib/cart";
import {
  useCart,
  useDeliveryZones,
  useStoreSettings,
  useUpdateCartLine,
} from "@/lib/store-queries";

const CartLineRow = ({ line }: { readonly line: CartLineView }) => {
  const t = useTranslations("app.cart");
  const conditions = useTranslations("store.condition");
  const boxText = useTranslations("web.store.product.box");
  const locale = useLocale();
  const update = useUpdateCartLine();
  const { item } = line;
  const name = item.product ? localized(item.product, "name", locale) : "";
  const problem = lineProblem(line);
  const busy = update.isPending;

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
            {item.box_theme ? (
              <span className="text-muted-foreground text-xs">
                {boxText("themeLine", {
                  theme: localized(item.box_theme, "name", locale),
                })}
              </span>
            ) : null}
          </div>
          <span className="shrink-0 font-medium text-sm tabular-nums">
            {formatPrice(line.unitPrice * line.quantity, locale)}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <QuantityStepper
            decreaseLabel={t("decrease")}
            disabled={busy || !line.buyable}
            increaseLabel={t("increase")}
            label={t("quantity")}
            max={Math.max(1, Math.min(line.available, MAX_QUANTITY))}
            onChange={(quantity) => update.mutate({ id: item.id, quantity })}
            value={line.quantity}
          />
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
  const summary =
    cart.data && settings.data ? summarizeCart(cart.data, settings.data) : null;
  const remaining = summary
    ? freeDeliveryRemaining(summary.totals.subtotal, baghdad?.free_from)
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
        {summary && summary.lines.length === 0 ? (
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
        {summary && summary.lines.length > 0 ? (
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
