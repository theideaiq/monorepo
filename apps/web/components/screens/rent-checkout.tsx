"use client";

import { useAuth } from "@repo/auth/provider";
import {
  formatPrice,
  liveVariants,
  localized,
  type PaymentMethod,
  variantName,
  variantSlug,
} from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { Locale } from "@repo/internationalization";
import {
  formatCalendarDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { ArrowLeftIcon, BanknoteIcon, LockIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  ContactCard,
  PaymentCard,
  resolveChoices,
  useCheckoutAreas,
} from "@/components/screens/checkout";
import { ErrorState, SectionSpinner } from "@/components/states";
import { CheckoutErrorNote } from "@/components/store/checkout-error";
import { productHref } from "@/components/store/product-card";
import {
  type ExtraRental,
  RentTogether,
} from "@/components/store/rent-together";
import {
  type AddressField,
  type AddressForm,
  accountPhone,
  emptyAddress,
  validateAddress,
} from "@/lib/address";
import { type CheckoutError, toCheckoutError } from "@/lib/errors";
import { orderPath, usePlaceRental } from "@/lib/order-checkout";
import { isNativeApp } from "@/lib/platform";
import { useProfile } from "@/lib/queries";
import {
  KEEP_AFTER_LATE_DAYS,
  type RentalsQuote,
  rentsTogether,
  useRentalQuote,
  useRentalsQuote,
} from "@/lib/rent";
import {
  useCategories,
  useDeliveryZones,
  useProduct,
  useStoreSettings,
} from "@/lib/store-queries";

interface RentSummaryProps {
  readonly busy: boolean;
  readonly cash: boolean;
  /** Why placing failed (CheckoutErrorNote), if it did. */
  readonly error: ReactNode;
  /** Each item's name, by product. */
  readonly names: ReadonlyMap<string, string>;
  /** The order, priced by the server (one delivery fee for every item). */
  readonly quote: RentalsQuote;
}

const Row = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => (
  <div className="flex justify-between gap-3">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
);

/** Each item's rent, the refundable deposits, delivery and the total. */
const RentSummary = ({ busy, cash, error, names, quote }: RentSummaryProps) => {
  const t = useTranslations("app.rent");
  const tCheckout = useTranslations("app.checkout");
  const locale = useLocale() as Locale;
  const days = (count: number) =>
    t("days", { count, n: formatNumber(count, locale) });
  const until = (value: string) =>
    formatCalendarDate(new Date(`${value}T12:00:00`), locale);
  const amount = formatPrice(quote.total, locale);
  const lateFee = Math.max(0, ...quote.items.map((item) => item.lateFee));

  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader>
        <CardTitle>{tCheckout("summary")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <dl className="grid gap-2">
          {quote.items.map((item) => (
            <div className="flex justify-between gap-3" key={item.productId}>
              <dt>
                <span className="block font-medium">
                  {names.get(item.productId)}
                </span>
                <span className="text-muted-foreground">
                  {item.until
                    ? t("rentUntil", { date: until(item.until) })
                    : t("rent", { days: days(item.days) })}
                </span>
              </dt>
              <dd className="tabular-nums">
                {formatPrice(item.price, locale)}
              </dd>
            </div>
          ))}
          <Row
            label={t("deposit")}
            value={formatPrice(quote.deposit, locale)}
          />
          <Row
            label={t("delivery")}
            value={quote.fee === null ? "—" : formatPrice(quote.fee, locale)}
          />
          <div className="flex justify-between gap-3 border-t pt-2 font-medium">
            <dt>{t("total")}</dt>
            <dd className="tabular-nums">{amount}</dd>
          </div>
        </dl>
        <ul className="grid gap-1 text-muted-foreground text-xs">
          <li>{t("depositNote")}</li>
          <li>
            {t("lateNote", {
              days: days(KEEP_AFTER_LATE_DAYS),
              fee: formatPrice(lateFee, locale),
            })}
          </li>
          <li>
            {quote.freeFrom === null
              ? t("plusDelivery")
              : t("freeFrom", { amount: formatPrice(quote.freeFrom, locale) })}
          </li>
        </ul>
        {error}
        <Button disabled={busy} size="lg" type="submit">
          {busy
            ? tCheckout("placing")
            : tCheckout(cash ? "placeOrderCash" : "placeOrder", { amount })}
        </Button>
        <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
          {cash ? (
            <BanknoteIcon className="size-3.5" />
          ) : (
            <LockIcon className="size-3.5" />
          )}
          {cash ? tCheckout("cashNote", { amount }) : tCheckout("secure")}
        </p>
      </CardContent>
    </Card>
  );
};

/** The chosen version (`?variant=`), or the only one there is. */
const useChosenVariant = (product: ReturnType<typeof useProduct>["data"]) => {
  const wanted = useSearchParams().get("variant");
  const live = product ? liveVariants(product.product_variants) : [];
  return (
    live.find((variant) => wanted && variantSlug(variant) === wanted) ??
    (live.length === 1 ? live[0] : undefined) ??
    null
  );
};

/** What the rent checkout loads: the item, its rate and the store's options. */
const useRentData = (slug: string) => {
  const locale = useLocale() as Locale;
  const profile = useProfile();
  const product = useProduct(slug);
  const variant = useChosenVariant(product.data);
  const quote = useRentalQuote(product.data?.id ?? null, variant?.id ?? null);
  const settings = useStoreSettings();
  const zones = useDeliveryZones();
  const queries = [product, quote, settings, zones];
  const loading = profile.isPending || queries.some((query) => query.isPending);
  const failed = queries.some((query) => query.isError);
  const name = product.data
    ? [
        localized(product.data, "name", locale),
        variant ? variantName(variant, locale) : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  return {
    failed,
    loading,
    name,
    product: product.data,
    profile: profile.data,
    quote: quote.data,
    retry: () => {
      for (const query of queries) {
        query.refetch();
      }
    },
    settings: settings.data,
    variant,
    zones: zones.data,
  };
};

/**
 * The rental's items (the chosen one and those added), their names, the
 * server's price for them and whether more can be added (films, books and
 * games rent together).
 */
const useRentItems = (
  data: ReturnType<typeof useRentData>,
  extras: readonly ExtraRental[],
  zoneId: string | null
) => {
  const categories = useCategories("rental");
  const { product, variant } = data;
  const items = product
    ? [
        { productId: product.id, variantId: variant?.id ?? null },
        ...extras.map((extra) => ({
          productId: extra.productId,
          variantId: null,
        })),
      ]
    : [];
  const together = useRentalsQuote(items, zoneId);
  const names = new Map<string, string>(
    extras.map((extra) => [extra.productId, extra.name])
  );
  if (product) {
    names.set(product.id, data.name);
  }
  return {
    canAddMore: product
      ? rentsTogether(product.category_id, categories.data ?? [])
      : false,
    items,
    names,
    together,
  };
};

/** Loading, failed, or not for rent on its own. */
const RentStatus = ({
  data,
}: {
  readonly data: ReturnType<typeof useRentData>;
}) => {
  const t = useTranslations("app.rent");
  if (data.failed) {
    return <ErrorState onRetry={data.retry} />;
  }
  if (data.loading) {
    return <SectionSpinner />;
  }
  if (!(data.product && data.quote)) {
    return (
      <p className="text-muted-foreground" role="status">
        {t("notRentable")}
      </p>
    );
  }
  return null;
};

/** The rental is booked but the payment page didn't open. */
const PaymentFailed = ({ orderId }: { readonly orderId: string }) => {
  const t = useTranslations("app.rent");
  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-xl flex-1 flex-col gap-4">
        <p className="rounded-md bg-muted p-4 text-sm" role="alert">
          {t("paymentFailed")}
        </p>
        <Button asChild className="self-start">
          <Link href={orderPath(orderId)}>{t("viewOrder")}</Link>
        </Button>
      </div>
    </>
  );
};

/**
 * Renting on its own: the item, and up to 2 more films, books or games
 * for the same delivery; delivered, paid online or in cash, then
 * `create_rentals_order()` (each item's rent and refundable deposit, one
 * delivery fee) and, for online payment, the hosted payment page. The
 * order's page follows it.
 */
export const RentCheckout = ({ slug }: { readonly slug: string }) => {
  const t = useTranslations("app.rent");
  const router = useRouter();
  const { user } = useAuth();
  const data = useRentData(slug);
  const { product, quote } = data;
  const place = usePlaceRental();
  const [payment, setPayment] = useState<PaymentMethod>("online");
  const [form, setForm] = useState<AddressForm | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AddressField[]>([]);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [extras, setExtras] = useState<ExtraRental[]>([]);

  const address: AddressForm = form ?? {
    ...emptyAddress(accountPhone(user?.phone)),
    fullName: data.profile?.full_name ?? "",
  };
  const set = (field: keyof AddressForm) => (value: string) =>
    setForm({ ...address, [field]: value });

  const { canAddMore, items, names, together } = useRentItems(
    data,
    extras,
    address.zoneId || null
  );

  const { cash, cashOffered, paymentMethod, zone, zoneList } = resolveChoices({
    address,
    payment,
    settings: data.settings,
    subtotal:
      (together.data?.rent ?? quote?.price ?? 0) +
      (together.data?.deposit ?? quote?.deposit ?? 0),
    zones: data.zones,
  });
  const areas = useCheckoutAreas(zone);
  const busy = place.isPending || place.isSuccess;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const result = validateAddress(address, { areas, zones: zoneList });
    setFieldErrors(result.errors);
    if (!(product && result.shipping)) {
      return;
    }
    place.mutate(
      {
        deliveryZone: result.zoneId,
        items,
        paymentMethod,
        shipping: result.shipping,
      },
      {
        onError: (mutationError) => setError(toCheckoutError(mutationError)),
        onSuccess: ({ order, paymentError, url }) => {
          if (paymentError) {
            setCreatedOrderId(order.id);
            return;
          }
          if (isNativeApp() || !url) {
            router.replace(orderPath(order.id));
          }
        },
      }
    );
  };

  if (createdOrderId) {
    return <PaymentFailed orderId={createdOrderId} />;
  }

  const ready = !(data.loading || data.failed);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex flex-1 flex-col gap-6">
        <Link
          className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
          href={productHref(slug)}
        >
          <ArrowLeftIcon className="size-4 rtl:rotate-180" />
          {t("back")}
        </Link>
        <RentStatus data={data} />
        {ready && product && quote ? (
          <form
            className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]"
            noValidate
            onSubmit={submit}
          >
            <div className="grid gap-6">
              <ContactCard
                address={address}
                areas={areas}
                busy={busy}
                fieldErrors={fieldErrors}
                onChange={set}
                onLocation={(location) => setForm({ ...address, location })}
                zone={zone}
                zones={zoneList}
              />
              {canAddMore ? (
                <RentTogether
                  busy={busy}
                  chosen={extras}
                  exclude={items.map((item) => item.productId)}
                  onAdd={(extra) => setExtras([...extras, extra])}
                  onRemove={(productId) =>
                    setExtras(
                      extras.filter((extra) => extra.productId !== productId)
                    )
                  }
                />
              ) : null}
              {cashOffered ? (
                <PaymentCard
                  busy={busy}
                  onChange={setPayment}
                  value={paymentMethod}
                />
              ) : null}
            </div>
            {together.data ? (
              <RentSummary
                busy={busy}
                cash={cash}
                error={
                  <CheckoutErrorNote
                    error={error}
                    onPhoneVerified={() => setError(null)}
                    phone={address.phone}
                  />
                }
                names={names}
                quote={together.data}
              />
            ) : (
              <SectionSpinner />
            )}
          </form>
        ) : null}
      </div>
    </>
  );
};
