"use client";

import { useAuth } from "@repo/auth/provider";
import {
  type Fulfilment,
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { ArrowLeftIcon, BanknoteIcon, LockIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  ContactCard,
  FulfilmentCard,
  PaymentCard,
  resolveChoices,
  useCheckoutAreas,
} from "@/components/screens/checkout";
import { ErrorState, SectionSpinner } from "@/components/states";
import { productHref } from "@/components/store/product-card";
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
  type RentalQuote,
  useRentalQuote,
} from "@/lib/rent";
import {
  useDeliveryZones,
  useProduct,
  useStoreSettings,
} from "@/lib/store-queries";

interface RentSummaryProps {
  readonly busy: boolean;
  readonly cash: boolean;
  /** The zone's fee; null for pickup (or before a zone is chosen). */
  readonly deliveryFee: number | null;
  readonly error: CheckoutError | null;
  readonly method: Fulfilment;
  readonly name: string;
  readonly quote: RentalQuote;
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

/** The rent, the refundable deposit, delivery and the total to pay. */
const RentSummary = ({
  busy,
  cash,
  deliveryFee,
  error,
  method,
  name,
  quote,
}: RentSummaryProps) => {
  const t = useTranslations("app.rent");
  const tCheckout = useTranslations("app.checkout");
  const locale = useLocale() as Locale;
  const days = (count: number) =>
    t("days", { count, n: formatNumber(count, locale) });
  const total = quote.price + quote.deposit + (deliveryFee ?? 0);
  const amount = formatPrice(total, locale);

  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader>
        <CardTitle>{tCheckout("summary")}</CardTitle>
        <CardDescription>{name}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <dl className="grid gap-2">
          <Row
            label={t("rent", { days: days(quote.days) })}
            value={formatPrice(quote.price, locale)}
          />
          <Row
            label={t("deposit")}
            value={formatPrice(quote.deposit, locale)}
          />
          {method === "delivery" ? (
            <Row
              label={t("delivery")}
              value={
                deliveryFee === null ? "—" : formatPrice(deliveryFee, locale)
              }
            />
          ) : null}
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
              fee: formatPrice(quote.lateFee, locale),
            })}
          </li>
          {method === "delivery" ? <li>{t("plusDelivery")}</li> : null}
        </ul>
        {error ? (
          <p className="text-destructive" role="alert">
            {tCheckout(`errors.${error}`)}
          </p>
        ) : null}
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
          {cash
            ? tCheckout(method === "pickup" ? "pickupCashNote" : "cashNote", {
                amount,
              })
            : tCheckout("secure")}
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
 * Renting one item on its own: delivery or pickup, online or cash, then
 * `create_rental_order()` (the rent and a refundable deposit) and, for
 * online payment, the hosted payment page. The order's page follows it.
 */
export const RentCheckout = ({ slug }: { readonly slug: string }) => {
  const t = useTranslations("app.rent");
  const router = useRouter();
  const { user } = useAuth();
  const data = useRentData(slug);
  const { product, quote, variant } = data;
  const place = usePlaceRental();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [payment, setPayment] = useState<PaymentMethod>("online");
  const [form, setForm] = useState<AddressForm | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AddressField[]>([]);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const address: AddressForm = form ?? {
    ...emptyAddress(accountPhone(user?.phone)),
    fullName: data.profile?.full_name ?? "",
  };
  const set = (field: keyof AddressForm) => (value: string) =>
    setForm({ ...address, [field]: value });

  const { cash, cashOffered, method, paymentMethod, pickup, zone, zoneList } =
    resolveChoices({
      address,
      fulfilment,
      payment,
      settings: data.settings,
      subtotal: (quote?.price ?? 0) + (quote?.deposit ?? 0),
      zones: data.zones,
    });
  const areas = useCheckoutAreas(method, zone);
  const busy = place.isPending || place.isSuccess;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const result = validateAddress(address, {
      areas,
      fulfilment: method,
      zones: zoneList,
    });
    setFieldErrors(result.errors);
    if (!(product && result.shipping)) {
      return;
    }
    place.mutate(
      {
        deliveryZone: result.zoneId,
        fulfilment: method,
        paymentMethod,
        productId: product.id,
        shipping: result.shipping,
        variantId: variant?.id ?? null,
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
              {pickup ? (
                <FulfilmentCard
                  busy={busy}
                  method={method}
                  onChange={setFulfilment}
                />
              ) : null}
              <ContactCard
                address={address}
                areas={areas}
                busy={busy}
                fieldErrors={fieldErrors}
                method={method}
                onChange={set}
                onLocation={(location) => setForm({ ...address, location })}
                pickup={pickup}
                zone={zone}
                zones={zoneList}
              />
              {cashOffered ? (
                <PaymentCard
                  busy={busy}
                  method={method}
                  onChange={setPayment}
                  value={paymentMethod}
                />
              ) : null}
            </div>
            <RentSummary
              busy={busy}
              cash={cash}
              deliveryFee={method === "delivery" ? (zone?.fee ?? null) : null}
              error={error}
              method={method}
              name={data.name}
              quote={quote}
            />
          </form>
        ) : null}
      </div>
    </>
  );
};
