"use client";

import { useAuth } from "@repo/auth/provider";
import {
  describeAttributes,
  type Fulfilment,
  formatPrice,
  localized,
  type PaymentMethod,
} from "@repo/commerce";
import type { DeliveryZone, PickupLocation } from "@repo/commerce/catalog";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@repo/design-system/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { ArrowLeftIcon, BanknoteIcon, LockIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { OrderSummary } from "@/components/store/order-summary";
import {
  type AddressField,
  type AddressForm,
  accountPhone,
  emptyAddress,
  validateAddress,
} from "@/lib/address";
import { summarizeCart } from "@/lib/cart";
import { type CheckoutError, toCheckoutError } from "@/lib/errors";
import { orderPath, usePlaceOrder } from "@/lib/order-checkout";
import { isNativeApp } from "@/lib/platform";
import { useProfile } from "@/lib/queries";
import {
  useCart,
  useDeliveryZones,
  useStoreSettings,
} from "@/lib/store-queries";

interface FieldProps {
  readonly children: ReactNode;
  readonly error?: string | null;
  readonly hint?: string;
  readonly htmlFor: string;
  readonly label: string;
  readonly optional?: boolean;
}

const Field = ({
  children,
  error,
  hint,
  htmlFor,
  label,
  optional,
}: FieldProps) => {
  const t = useTranslations("common");
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground text-xs">
            ({t("optional")})
          </span>
        ) : null}
      </Label>
      {children}
      {hint && !error ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-destructive text-xs" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
};

interface ChoiceProps<T extends string> {
  readonly disabled?: boolean;
  readonly label: string;
  readonly onChange: (value: T) => void;
  readonly options: readonly { hint: string; label: string; value: T }[];
  readonly value: T;
}

/** A labelled group of radio cards (delivery or pickup, how to pay). */
const Choice = <T extends string>({
  disabled,
  label,
  onChange,
  options,
  value,
}: ChoiceProps<T>) => {
  const id = useId();
  return (
    <RadioGroup
      aria-label={label}
      className="grid gap-3 sm:grid-cols-2"
      disabled={disabled}
      onValueChange={(next) => onChange(next as T)}
      value={value}
    >
      {options.map((option) => (
        <Label
          className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal has-data-[state=checked]:border-primary"
          htmlFor={`${id}-${option.value}`}
          key={option.value}
        >
          <RadioGroupItem
            className="mt-0.5"
            id={`${id}-${option.value}`}
            value={option.value}
          />
          <span className="grid gap-1">
            <span className="font-medium">{option.label}</span>
            <span className="text-muted-foreground text-xs">{option.hint}</span>
          </span>
        </Label>
      ))}
    </RadioGroup>
  );
};

/** Where and when to collect a pickup order. */
const PickupDetails = ({ pickup }: { readonly pickup: PickupLocation }) => {
  const t = useTranslations("app.checkout.pickup");
  const locale = useLocale() as Locale;
  const address = localized(pickup, "address", locale);
  const hours = localized(pickup, "hours", locale);
  return (
    <dl className="grid gap-3 rounded-md bg-muted p-4 text-sm sm:col-span-2">
      <div className="grid gap-0.5">
        <dt className="text-muted-foreground">{t("address")}</dt>
        <dd className="whitespace-pre-line">{address}</dd>
      </div>
      {hours ? (
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground">{t("hours")}</dt>
          <dd className="whitespace-pre-line">{hours}</dd>
        </div>
      ) : null}
    </dl>
  );
};

/** The fee and delivery time of the chosen zone. */
const zoneHint = (
  zone: DeliveryZone | undefined,
  t: ReturnType<typeof useTranslations<"app.checkout">>,
  locale: Locale
) =>
  zone
    ? t("address.governorateHint", {
        fee: formatPrice(zone.fee, locale),
        max: formatNumber(zone.max_days, locale),
        min: formatNumber(zone.min_days, locale),
      })
    : undefined;

interface OptionCardProps<T extends string> {
  readonly busy: boolean;
  readonly method: Fulfilment;
  readonly onChange: (value: T) => void;
}

/** Delivery to an address, or pickup from the store. */
const FulfilmentCard = ({
  busy,
  method,
  onChange,
}: OptionCardProps<Fulfilment>) => {
  const t = useTranslations("app.checkout.fulfilment");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Choice
          disabled={busy}
          label={t("title")}
          onChange={onChange}
          options={[
            {
              hint: t("deliveryHint"),
              label: t("delivery"),
              value: "delivery",
            },
            { hint: t("pickupHint"), label: t("pickup"), value: "pickup" },
          ]}
          value={method}
        />
      </CardContent>
    </Card>
  );
};

/** Online through Wayl, or cash to the courier or at the counter. */
const PaymentCard = ({
  busy,
  method,
  onChange,
  value,
}: OptionCardProps<PaymentMethod> & { readonly value: PaymentMethod }) => {
  const t = useTranslations("app.checkout.payment");
  const pickup = method === "pickup";
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Choice
          disabled={busy}
          label={t("title")}
          onChange={onChange}
          options={[
            { hint: t("onlineHint"), label: t("online"), value: "online" },
            {
              hint: t(pickup ? "pickupCashHint" : "cashHint"),
              label: t(pickup ? "pickupCash" : "cash"),
              value: "cash_on_delivery",
            },
          ]}
          value={value}
        />
      </CardContent>
    </Card>
  );
};

interface ContactCardProps {
  readonly address: AddressForm;
  readonly busy: boolean;
  readonly fieldErrors: AddressField[];
  readonly method: Fulfilment;
  readonly onChange: (field: keyof AddressForm) => (value: string) => void;
  readonly pickup: PickupLocation | null;
  readonly zone: DeliveryZone | undefined;
  readonly zones: DeliveryZone[];
}

/** The recipient, and the delivery address and zone (or the store's counter). */
const ContactCard = ({
  address,
  busy,
  fieldErrors,
  method,
  onChange: set,
  pickup,
  zone,
  zones: zoneList,
}: ContactCardProps) => {
  const t = useTranslations("app.checkout");
  const locale = useLocale() as Locale;
  const id = useId();
  const fieldError = (field: AddressField) =>
    fieldErrors.includes(field) ? t(`fieldErrors.${field}`) : null;
  const describedBy = (field: AddressField) =>
    fieldErrors.includes(field) ? `${id}-${field}-error` : undefined;
  const isPickup = method === "pickup";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(isPickup ? "pickup.title" : "address.title")}</CardTitle>
        <CardDescription>
          {t(isPickup ? "pickup.description" : "address.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <fieldset className="grid gap-4 sm:grid-cols-2" disabled={busy}>
          {isPickup && pickup ? <PickupDetails pickup={pickup} /> : null}
          <Field
            error={fieldError("fullName")}
            htmlFor={`${id}-fullName`}
            label={t("address.fullName")}
          >
            <Input
              aria-describedby={describedBy("fullName")}
              aria-invalid={fieldErrors.includes("fullName")}
              autoComplete="name"
              id={`${id}-fullName`}
              maxLength={120}
              onChange={(event) => set("fullName")(event.target.value)}
              value={address.fullName}
            />
          </Field>
          <Field
            error={fieldError("phone")}
            hint={t("address.phoneHint")}
            htmlFor={`${id}-phone`}
            label={t("address.phone")}
          >
            <Input
              aria-describedby={describedBy("phone")}
              aria-invalid={fieldErrors.includes("phone")}
              autoComplete="tel"
              className="text-start"
              dir="ltr"
              id={`${id}-phone`}
              inputMode="tel"
              maxLength={20}
              onChange={(event) => set("phone")(event.target.value)}
              type="tel"
              value={address.phone}
            />
          </Field>
          {isPickup ? null : (
            <>
              <Field
                error={fieldError("governorate")}
                hint={zoneHint(zone, t, locale)}
                htmlFor={`${id}-governorate`}
                label={t("address.governorate")}
              >
                <Select onValueChange={set("zoneId")} value={address.zoneId}>
                  <SelectTrigger
                    aria-describedby={describedBy("governorate")}
                    aria-invalid={fieldErrors.includes("governorate")}
                    className="w-full"
                    id={`${id}-governorate`}
                  >
                    <SelectValue
                      placeholder={t("address.governoratePlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneList.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {t("address.zoneOption", {
                          fee: formatPrice(option.fee, locale),
                          name: localized(option, "name", locale),
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field htmlFor={`${id}-city`} label={t("address.city")} optional>
                <Input
                  autoComplete="address-level2"
                  id={`${id}-city`}
                  maxLength={60}
                  onChange={(event) => set("city")(event.target.value)}
                  value={address.city}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  error={fieldError("address")}
                  htmlFor={`${id}-address`}
                  label={t("address.address")}
                >
                  <Textarea
                    aria-describedby={describedBy("address")}
                    aria-invalid={fieldErrors.includes("address")}
                    autoComplete="street-address"
                    id={`${id}-address`}
                    maxLength={500}
                    onChange={(event) => set("address")(event.target.value)}
                    placeholder={t("address.addressPlaceholder")}
                    rows={3}
                    value={address.address}
                  />
                </Field>
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <Field
              htmlFor={`${id}-notes`}
              label={t(isPickup ? "pickup.notes" : "address.notes")}
              optional
            >
              <Textarea
                id={`${id}-notes`}
                maxLength={500}
                onChange={(event) => set("notes")(event.target.value)}
                placeholder={t(
                  isPickup
                    ? "pickup.notesPlaceholder"
                    : "address.notesPlaceholder"
                )}
                rows={2}
                value={address.notes}
              />
            </Field>
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
};

interface SummaryCardProps {
  readonly busy: boolean;
  readonly cash: boolean;
  readonly error: CheckoutError | null;
  readonly method: Fulfilment;
  readonly summary: ReturnType<typeof summarizeCart>;
}

/** What's being ordered, the totals, and the button that places the order. */
const SummaryCard = ({
  busy,
  cash,
  error,
  method,
  summary,
}: SummaryCardProps) => {
  const t = useTranslations("app.checkout");
  const locale = useLocale() as Locale;
  const amount = formatPrice(summary.totals.total, locale);
  const cashNote = method === "pickup" ? "pickupCashNote" : "cashNote";

  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader>
        <CardTitle>{t("summary")}</CardTitle>
        <CardDescription>
          {t("itemsCount", {
            count: formatNumber(summary.totals.count, locale),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="grid gap-2 text-sm">
          {summary.lines
            .filter((line) => line.buyable)
            .map(({ item, quantity }) => (
              <li className="flex justify-between gap-3" key={item.id}>
                <span className="min-w-0">
                  <span className="line-clamp-1">
                    {item.product
                      ? localized(item.product, "name", locale)
                      : null}
                  </span>
                  {item.variant ? (
                    <span className="block text-muted-foreground text-xs">
                      {describeAttributes(item.variant.attributes)}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  × {formatNumber(quantity, locale)}
                </span>
              </li>
            ))}
        </ul>
        <OrderSummary {...summary.totals} />
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {t(`errors.${error}`)}
          </p>
        ) : null}
        <Button disabled={busy || !summary.canCheckout} size="lg" type="submit">
          {busy
            ? t("placing")
            : t(cash ? "placeOrderCash" : "placeOrder", { amount })}
        </Button>
        <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
          {cash ? (
            <BanknoteIcon className="size-3.5" />
          ) : (
            <LockIcon className="size-3.5" />
          )}
          {cash ? t(cashNote, { amount }) : t("secure")}
        </p>
      </CardContent>
    </Card>
  );
};

/**
 * What the customer can choose (pickup and cash only when the store offers
 * them) and what they chose, falling back to delivery and online payment.
 */
const resolveChoices = ({
  address,
  fulfilment,
  payment,
  settings,
  zones,
}: {
  address: AddressForm;
  fulfilment: Fulfilment;
  payment: PaymentMethod;
  settings:
    | { cashOnDelivery: boolean; pickup: PickupLocation | null }
    | undefined;
  zones: DeliveryZone[] | undefined;
}) => {
  const zoneList = zones ?? [];
  const pickup = settings?.pickup ?? null;
  const cashOffered = settings?.cashOnDelivery ?? false;
  const paymentMethod: PaymentMethod = cashOffered ? payment : "online";
  return {
    cash: paymentMethod === "cash_on_delivery",
    cashOffered,
    method: (pickup ? fulfilment : "delivery") as Fulfilment,
    paymentMethod,
    pickup,
    zone: zoneList.find(({ id }) => id === address.zoneId),
    zoneList,
  };
};

/**
 * Checkout: delivery (address and zone) or pickup, online or cash payment,
 * then `create_order` (which prices the fee from the zone) and, for online
 * payment, the hosted payment page. The order's page shows what happened.
 */
export const Checkout = () => {
  const t = useTranslations("app.checkout");
  const router = useRouter();
  const { user } = useAuth();
  const profile = useProfile();
  const cart = useCart();
  const settings = useStoreSettings();
  const zones = useDeliveryZones();
  const place = usePlaceOrder();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [payment, setPayment] = useState<PaymentMethod>("online");
  const [form, setForm] = useState<AddressForm | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AddressField[]>([]);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // The form starts from the account: its phone number and name.
  const address: AddressForm = form ?? {
    ...emptyAddress(accountPhone(user?.phone)),
    fullName: profile.data?.full_name ?? "",
  };

  const set = (field: keyof AddressForm) => (value: string) =>
    setForm({ ...address, [field]: value });

  const { cash, cashOffered, method, paymentMethod, pickup, zone, zoneList } =
    resolveChoices({
      address,
      fulfilment,
      payment,
      settings: settings.data,
      zones: zones.data,
    });

  const summary =
    cart.data && settings.data
      ? summarizeCart(cart.data, settings.data, {
          fulfilment: method,
          zoneFee: zone?.fee,
        })
      : null;
  const busy = place.isPending || place.isSuccess;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const result = validateAddress(address, {
      fulfilment: method,
      zones: zoneList,
    });
    setFieldErrors(result.errors);
    if (!result.shipping) {
      return;
    }
    const request = {
      deliveryZone: result.zoneId,
      fulfilment: method,
      paymentMethod,
      shipping: result.shipping,
    };
    place.mutate(request, {
      onError: (mutationError) => setError(toCheckoutError(mutationError)),
      onSuccess: ({ order, paymentError, url }) => {
        if (paymentError) {
          setCreatedOrderId(order.id);
          return;
        }
        // On the web the payment page has replaced this one; the apps open
        // it in the system browser, so show the order meanwhile.
        if (isNativeApp() || !url) {
          router.replace(orderPath(order.id));
        }
      },
    });
  };

  if (createdOrderId) {
    return (
      <>
        <PageHeader title={t("title")} />
        <div className="flex max-w-xl flex-1 flex-col gap-4">
          <p className="rounded-md bg-muted p-4 text-sm" role="alert">
            {t("orderCreatedPaymentFailed")}
          </p>
          <Button asChild className="self-start">
            <Link href={orderPath(createdOrderId)}>{t("viewOrder")}</Link>
          </Button>
        </div>
      </>
    );
  }

  const loading =
    cart.isPending ||
    settings.isPending ||
    zones.isPending ||
    profile.isPending;
  const failed = cart.isError || settings.isError || zones.isError;
  const empty = summary !== null && summary.lines.length === 0 && !busy;

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex flex-1 flex-col gap-6">
        <Link
          className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
          href="/cart"
        >
          <ArrowLeftIcon className="size-4 rtl:rotate-180" />
          {t("backToCart")}
        </Link>
        {loading && !failed ? <SectionSpinner /> : null}
        {failed ? (
          <ErrorState
            onRetry={() => {
              cart.refetch();
              settings.refetch();
              zones.refetch();
            }}
          />
        ) : null}
        {empty ? (
          <p className="text-muted-foreground" role="status">
            {t("errors.cartEmpty")}
          </p>
        ) : null}
        {summary && !loading && !empty ? (
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
                busy={busy}
                fieldErrors={fieldErrors}
                method={method}
                onChange={set}
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

            <SummaryCard
              busy={busy}
              cash={cash}
              error={error}
              method={method}
              summary={summary}
            />
          </form>
        ) : null}
      </div>
    </>
  );
};
