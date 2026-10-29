"use client";

import { formatPhone } from "@repo/auth/phone";
import { useAuth } from "@repo/auth/provider";
import {
  BULB_MIN_SPEND,
  BULB_STEP,
  BULB_VALUE_IQD,
  type CheckoutQuote,
  formatPrice,
  localized,
  type PaymentMethod,
  variantName,
} from "@repo/commerce";
import type { DeliveryZone } from "@repo/commerce/catalog";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
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
import { Field, LandmarkFields } from "@/components/address-fields";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { CheckoutErrorNote } from "@/components/store/checkout-error";
import { CouponField } from "@/components/store/coupon-field";
import {
  emptyGift,
  GiftDetailsCard,
  type GiftForm,
  GiftSwitch,
} from "@/components/store/gift-checkout";
import { OrderSummary } from "@/components/store/order-summary";
import {
  type AddressField,
  type AddressForm,
  accountPhone,
  emptyAddress,
  type MapPin,
  type ShippingAddress,
  validateAddress,
} from "@/lib/address";
import {
  addressLine,
  addressToForm,
  MAX_ADDRESSES,
  type SavedAddress,
  useAddresses,
  useCheckoutPayment,
  useRememberPayment,
  useSaveAddress,
} from "@/lib/address-book";
import { useMyBulbs } from "@/lib/bulbs-queries";
import { freeDeliveryRemaining, isRentLine, summarizeCart } from "@/lib/cart";
import { type CheckoutError, toCheckoutError } from "@/lib/errors";
import { useInviteDiscount } from "@/lib/invites";
import { orderPath, usePlaceGift, usePlaceOrder } from "@/lib/order-checkout";
import { isNativeApp } from "@/lib/platform";
import { useProfile } from "@/lib/queries";
import {
  type QuoteRequest,
  useCart,
  useCheckoutQuote,
  useDeliveryAreas,
  useDeliveryZones,
  useStoreSettings,
} from "@/lib/store-queries";

interface ChoiceProps<T extends string> {
  readonly disabled?: boolean;
  readonly label: string;
  readonly onChange: (value: T) => void;
  readonly options: readonly { hint: string; label: string; value: T }[];
  readonly value: T;
}

/** A labelled group of radio cards (how to pay). */
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

interface PaymentCardProps {
  readonly busy: boolean;
  readonly onChange: (value: PaymentMethod) => void;
  readonly value: PaymentMethod;
}

/** Online through Wayl, or cash to the courier. */
export const PaymentCard = ({ busy, onChange, value }: PaymentCardProps) => {
  const t = useTranslations("app.checkout.payment");
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
              hint: t("cashHint"),
              label: t("cash"),
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
  /** The courier's areas in the chosen zone; empty when unknown. */
  readonly areas: readonly string[];
  readonly busy: boolean;
  readonly fieldErrors: AddressField[];
  readonly onChange: (field: keyof AddressForm) => (value: string) => void;
  readonly onLocation: (location: MapPin | null) => void;
  readonly zone: DeliveryZone | undefined;
  readonly zones: DeliveryZone[];
}

/** The recipient, and the delivery address and zone. */
export const ContactCard = ({
  address,
  areas,
  busy,
  fieldErrors,
  onChange: set,
  onLocation,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("address.title")}</CardTitle>
        <CardDescription>{t("address.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <fieldset className="grid gap-4 sm:grid-cols-2" disabled={busy}>
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
          {areas.length > 0 ? (
            <Field
              error={fieldError("city")}
              hint={t("address.areaHint")}
              htmlFor={`${id}-city`}
              label={t("address.area")}
            >
              <Input
                aria-describedby={describedBy("city")}
                aria-invalid={fieldErrors.includes("city")}
                autoComplete="off"
                dir="rtl"
                id={`${id}-city`}
                list={`${id}-areas`}
                maxLength={60}
                onChange={(event) => set("city")(event.target.value)}
                value={address.city}
              />
              <datalist id={`${id}-areas`}>
                {areas.map((area) => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            </Field>
          ) : (
            <Field htmlFor={`${id}-city`} label={t("address.city")} optional>
              <Input
                autoComplete="address-level2"
                id={`${id}-city`}
                maxLength={60}
                onChange={(event) => set("city")(event.target.value)}
                value={address.city}
              />
            </Field>
          )}
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
          <LandmarkFields
            disabled={busy}
            id={id}
            landmark={address.landmark}
            location={address.location}
            onLandmark={set("landmark")}
            onLocation={onLocation}
          />
          <div className="sm:col-span-2">
            <Field htmlFor={`${id}-notes`} label={t("address.notes")} optional>
              <Textarea
                id={`${id}-notes`}
                maxLength={500}
                onChange={(event) => set("notes")(event.target.value)}
                placeholder={t("address.notesPlaceholder")}
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

interface SavedAddressesCardProps {
  readonly addresses: SavedAddress[];
  readonly busy: boolean;
  readonly editing: boolean;
  readonly onEdit: () => void;
  readonly onSelect: (id: string) => void;
  readonly selected: string;
}

/** Where to deliver: a saved address (shown briefly) or a new one. */
const SavedAddressesCard = ({
  addresses,
  busy,
  editing,
  onEdit,
  onSelect,
  selected,
}: SavedAddressesCardProps) => {
  const locale = useLocale();
  const t = useTranslations("app.checkout.saved");
  const id = useId();
  const chosen = addresses.find((row) => row.id === selected);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <RadioGroup
          aria-label={t("title")}
          className="flex flex-wrap gap-2"
          disabled={busy}
          onValueChange={onSelect}
          value={selected}
        >
          {[
            ...addresses.map((row) => ({ id: row.id, label: row.label })),
            { id: NEW_ADDRESS, label: t("new") },
          ].map((option) => (
            <Label
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 has-[[data-state=checked]]:border-primary"
              htmlFor={`${id}-${option.id}`}
              key={option.id}
            >
              <RadioGroupItem id={`${id}-${option.id}`} value={option.id} />
              {option.label}
            </Label>
          ))}
        </RadioGroup>
        {chosen && !editing ? (
          <div className="flex items-start justify-between gap-4 text-sm">
            <address className="grid gap-0.5 not-italic">
              <span className="font-medium">{chosen.full_name}</span>
              <span>{addressLine(chosen, locale)}</span>
              {chosen.landmark ? (
                <span className="text-muted-foreground">{chosen.landmark}</span>
              ) : null}
              <span className="text-muted-foreground" dir="ltr">
                {formatPhone(chosen.phone)}
              </span>
            </address>
            <Button
              disabled={busy}
              onClick={onEdit}
              size="sm"
              type="button"
              variant="ghost"
            >
              {t("edit")}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

interface SaveAddressFieldsProps {
  readonly busy: boolean;
  readonly label: string;
  readonly onLabel: (value: string) => void;
  readonly onSave: (save: boolean) => void;
  readonly save: boolean;
}

/** "Save this address for next time", and its name. */
const SaveAddressFields = ({
  busy,
  label,
  onLabel,
  onSave,
  save,
}: SaveAddressFieldsProps) => {
  const t = useTranslations("app.checkout.saved");
  const id = useId();
  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={save}
          disabled={busy}
          id={`${id}-save`}
          onCheckedChange={(checked) => onSave(checked === true)}
        />
        <Label htmlFor={`${id}-save`}>{t("save")}</Label>
      </div>
      {save ? (
        <Field htmlFor={`${id}-label`} label={t("label")}>
          <Input
            disabled={busy}
            id={`${id}-label`}
            maxLength={40}
            onChange={(event) => onLabel(event.target.value)}
            placeholder={t("labelPlaceholder")}
            value={label}
          />
        </Field>
      ) : null}
    </div>
  );
};

interface BulbsCardProps {
  /** Bulbs the member can spend now. */
  readonly available: number;
  readonly busy: boolean;
  readonly onChange: (use: boolean) => void;
  readonly use: boolean;
  /** Bulbs the order would take (all of them up to what it costs). */
  readonly using: number;
}

/** Pay with Bulbs: up to the whole order, 1 IQD each, in steps of 250 from 1,000. */
const BulbsCard = ({
  available,
  busy,
  onChange,
  use,
  using,
}: BulbsCardProps) => {
  const t = useTranslations("app.checkout.bulbs");
  const locale = useLocale() as Locale;
  if (available <= 0) {
    return null;
  }
  const enough = available >= BULB_MIN_SPEND;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("available", {
            amount: formatPrice(available * BULB_VALUE_IQD, locale),
            bulbs: formatNumber(available, locale),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <label className="flex items-center gap-3 text-sm" htmlFor="use-bulbs">
          <Checkbox
            checked={use && enough}
            disabled={busy || !enough}
            id="use-bulbs"
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {use
            ? t("using", {
                amount: formatPrice(using * BULB_VALUE_IQD, locale),
                bulbs: formatNumber(using, locale),
              })
            : t("use")}
        </label>
        <p className="text-muted-foreground text-xs">
          {t("steps", {
            min: formatNumber(BULB_MIN_SPEND, locale),
            step: formatNumber(BULB_STEP, locale),
          })}
        </p>
      </CardContent>
    </Card>
  );
};

interface SummaryCardProps {
  readonly busy: boolean;
  readonly cash: boolean;
  /** Why placing failed (CheckoutErrorNote), if it did. */
  readonly error: ReactNode;
  /** "Deliver to Home · Pay online", when a saved address is chosen. */
  readonly oneTap?: string | null;
  /** The server's quote, once a zone is chosen. */
  readonly quote: CheckoutQuote | null;
  readonly summary: ReturnType<typeof summarizeCart>;
}

/** What's being ordered, the totals, and the button that places the order. */
const SummaryCard = ({
  busy,
  cash,
  error,
  oneTap,
  quote,
  summary,
}: SummaryCardProps) => {
  const t = useTranslations("app.checkout");
  const locale = useLocale() as Locale;
  const totals = quote ?? summary.totals;
  const amount = formatPrice(totals.total, locale);
  const toFree =
    quote && quote.shippingFee > 0
      ? freeDeliveryRemaining(quote.subtotal, quote.freeFrom)
      : 0;

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
                  {item.variant && variantName(item.variant, locale) ? (
                    <span className="block text-muted-foreground text-xs">
                      {variantName(item.variant, locale)}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {isRentLine(item)
                    ? t("rentLine")
                    : `× ${formatNumber(quantity, locale)}`}
                </span>
              </li>
            ))}
        </ul>
        <OrderSummary {...totals} />
        {quote ? (
          <CouponField
            applied={quote.couponCode}
            used={quote.discountSource === "coupon"}
          />
        ) : null}
        {quote?.freeDelivery === "plan" ? (
          <p className="text-muted-foreground text-xs">{t("planDelivery")}</p>
        ) : null}
        {toFree > 0 ? (
          <p className="text-muted-foreground text-xs">
            {t("freeDeliveryNudge", { amount: formatPrice(toFree, locale) })}
          </p>
        ) : null}
        {quote && quote.bulbsToEarn > 0 ? (
          <p className="text-muted-foreground text-xs">
            {t("bulbsToEarn", {
              bulbs: formatNumber(quote.bulbsToEarn, locale),
            })}
          </p>
        ) : null}
        {error}
        {oneTap ? <p className="font-medium text-sm">{oneTap}</p> : null}
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
          {cash ? t("cashNote", { amount }) : t("secure")}
        </p>
      </CardContent>
    </Card>
  );
};

/** The picker's "A new address". */
const NEW_ADDRESS = "new";

/**
 * What to ask the server to price: nothing until delivery has a zone (or a
 * governorate), and nothing for a cart that can't be ordered.
 */
const quoteRequestFor = ({
  canCheckout,
  governorate,
  paymentMethod,
  useBulbs,
  zoneId,
}: {
  canCheckout: boolean;
  governorate: string;
  paymentMethod: PaymentMethod;
  useBulbs: number;
  zoneId: string | undefined;
}): QuoteRequest | null => {
  if (!(canCheckout && (zoneId || governorate))) {
    return null;
  }
  return {
    governorate: zoneId ? null : governorate,
    paymentMethod,
    useBulbs,
    zoneId,
  };
};

/**
 * What the customer can choose (cash only when the store offers it) and what
 * they chose, falling back to online payment.
 */
export const resolveChoices = ({
  address,
  payment,
  settings,
  subtotal,
  zones,
}: {
  address: AddressForm;
  payment: PaymentMethod;
  settings: { cashLimit: number | null; cashOnDelivery: boolean } | undefined;
  /** The cart's subtotal: delivery above the cash limit is paid online. */
  subtotal: number;
  zones: DeliveryZone[] | undefined;
}) => {
  const zoneList = zones ?? [];
  const overLimit =
    settings?.cashLimit !== null &&
    settings?.cashLimit !== undefined &&
    subtotal > settings.cashLimit;
  const cashOffered = (settings?.cashOnDelivery ?? false) && !overLimit;
  const paymentMethod: PaymentMethod = cashOffered ? payment : "online";
  return {
    cash: paymentMethod === "cash_on_delivery",
    cashOffered,
    paymentMethod,
    zone: zoneList.find(({ id }) => id === address.zoneId),
    zoneList,
  };
};

/** The courier's areas the address needs (delivery to a known zone). */
export const useCheckoutAreas = (zone: DeliveryZone | undefined): string[] =>
  useDeliveryAreas(zone?.carrier_province ?? null).data ?? [];

/**
 * The customer's choices and the order's price: a local estimate, then the
 * server's quote (`checkout_quote`), which applies delivery, discounts, the
 * giveaway cap and Bulbs.
 */
const useCheckoutPricing = ({
  address,
  cart,
  payment,
  settings,
  useBulbs,
  zones,
}: {
  address: AddressForm;
  cart: ReturnType<typeof useCart>;
  payment: PaymentMethod;
  settings: ReturnType<typeof useStoreSettings>;
  useBulbs: boolean;
  zones: ReturnType<typeof useDeliveryZones>;
}) => {
  const bulbs = useMyBulbs();
  const availableBulbs = Math.max(0, bulbs.data?.available ?? 0);
  // A new invite re-prices the order.
  const invited = useInviteDiscount().data === true;

  const estimate =
    cart.data && settings.data ? summarizeCart(cart.data, settings.data) : null;
  const choices = resolveChoices({
    address,
    payment,
    settings: settings.data,
    subtotal: estimate?.totals.subtotal ?? 0,
    zones: zones.data,
  });
  const { paymentMethod, zone } = choices;

  const areas = useCheckoutAreas(zone);

  const summary =
    cart.data && settings.data
      ? summarizeCart(cart.data, settings.data, {
          freeFrom: zone?.free_from,
          zoneFee: zone?.fee,
        })
      : null;
  const quote = useCheckoutQuote(
    quoteRequestFor({
      canCheckout: summary?.canCheckout ?? false,
      governorate: address.governorate,
      paymentMethod,
      useBulbs: useBulbs ? availableBulbs : 0,
      zoneId: zone?.id,
    }),
    [cart.dataUpdatedAt, invited]
  ).data;
  // Bulbs pay the whole order: nothing is left to pay, online or in cash.
  const paidWithBulbs = Boolean(
    quote && quote.bulbsUsed > 0 && quote.total === 0
  );
  return {
    ...choices,
    areas,
    availableBulbs,
    // Nothing is paid in cash when Bulbs cover the order.
    cash: choices.cash && !paidWithBulbs,
    paidWithBulbs,
    paymentOffered: choices.cashOffered && !paidWithBulbs,
    quote,
    summary,
  };
};

/**
 * The address book at checkout: the saved address to deliver to (the
 * default first) or a new one, and the way the member last paid. After an
 * order, it remembers a new way to pay and saves a new address if asked.
 */
const useAddressBook = () => {
  const t = useTranslations("app.checkout");
  const { user } = useAuth();
  const profile = useProfile();
  const addresses = useAddresses();
  const remembered = useCheckoutPayment();
  const rememberPayment = useRememberPayment();
  const saveAddress = useSaveAddress();
  const [chosenPayment, setPayment] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState<AddressForm | null>(null);
  // A saved address's id, or NEW_ADDRESS; null: the default address.
  const [picked, setPicked] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveNew, setSaveNew] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const saved = addresses.data ?? [];
  const selected = picked ?? saved[0]?.id ?? NEW_ADDRESS;
  const savedAddress = saved.find((row) => row.id === selected);

  // A new address starts from the account: its phone number and name.
  const address: AddressForm =
    form ??
    (savedAddress
      ? addressToForm(savedAddress)
      : {
          ...emptyAddress(accountPhone(user?.phone)),
          fullName: profile.data?.full_name ?? "",
        });

  /** Best effort after an order: neither stops it. */
  const afterOrder = ({
    paymentMethod,
    shipping,
    zoneId,
  }: {
    /** The way chosen, when there was a choice. */
    paymentMethod: PaymentMethod | null;
    shipping: ShippingAddress;
    zoneId: string | null;
  }) => {
    if (paymentMethod && paymentMethod !== remembered.data) {
      rememberPayment.mutate(paymentMethod);
    }
    if (!savedAddress && saveNew) {
      saveAddress.mutate({
        input: {
          area: shipping.city,
          fullName: shipping.full_name,
          governorate: shipping.governorate,
          label: newLabel.trim() || t("saved.defaultLabel"),
          landmark: shipping.landmark,
          location: shipping.location ?? null,
          phone: shipping.phone,
          street: shipping.address,
          zoneId,
        },
      });
    }
  };

  return {
    address,
    afterOrder,
    editing,
    loading:
      (addresses.isPending && !addresses.isError) ||
      (remembered.isPending && !remembered.isError),
    newLabel,
    /** "Deliver to Home · Pay online", for a saved address. */
    oneTap: (cash: boolean) =>
      savedAddress
        ? t("oneTap", {
            label: savedAddress.label,
            payment: t(cash ? "payment.cash" : "payment.online"),
          })
        : null,
    payment: chosenPayment ?? remembered.data ?? "online",
    pick: (id: string) => {
      setPicked(id);
      setForm(null);
      setEditing(false);
    },
    saved,
    savedAddress,
    saveNew,
    selected,
    setEditing,
    setForm,
    setNewLabel,
    setPayment,
    setSaveNew,
  };
};

interface AddressSectionProps {
  readonly areas: readonly string[];
  readonly book: ReturnType<typeof useAddressBook>;
  readonly busy: boolean;
  readonly fieldErrors: AddressField[];
  readonly onChange: (field: keyof AddressForm) => (value: string) => void;
  readonly zone: DeliveryZone | undefined;
  readonly zones: DeliveryZone[];
}

/**
 * Where the order goes: a saved address (briefly, "Edit" opens the form),
 * or the form, with "Save this address" for a new one.
 */
const AddressSection = ({
  areas,
  book,
  busy,
  fieldErrors,
  onChange,
  zone,
  zones,
}: AddressSectionProps) => {
  const { address, saved, savedAddress } = book;
  const showForm = !(savedAddress && !book.editing);
  return (
    <>
      {saved.length > 0 ? (
        <SavedAddressesCard
          addresses={saved}
          busy={busy}
          editing={book.editing}
          onEdit={() => book.setEditing(true)}
          onSelect={book.pick}
          selected={book.selected}
        />
      ) : null}
      {showForm ? (
        <ContactCard
          address={address}
          areas={areas}
          busy={busy}
          fieldErrors={fieldErrors}
          onChange={onChange}
          onLocation={(location) => book.setForm({ ...address, location })}
          zone={zone}
          zones={zones}
        />
      ) : null}
      {!savedAddress && saved.length < MAX_ADDRESSES ? (
        <SaveAddressFields
          busy={busy}
          label={book.newLabel}
          onLabel={book.setNewLabel}
          onSave={book.setSaveNew}
          save={book.saveNew}
        />
      ) : null}
    </>
  );
};

interface WhereItGoesProps extends AddressSectionProps {
  readonly gift: GiftForm | null;
  readonly missingGiftZone: boolean;
  readonly onGift: (gift: GiftForm | null) => void;
  /** The cart holds a rental, so it can't be a gift. */
  readonly rentals: boolean;
}

/** "Send as a gift" and the gift's details, or the delivery address. */
const WhereItGoes = ({
  gift,
  missingGiftZone,
  onGift,
  rentals,
  ...address
}: WhereItGoesProps) => (
  <>
    <GiftSwitch
      busy={address.busy}
      gift={gift !== null}
      onChange={(on) => onGift(on ? emptyGift : null)}
      rentals={rentals}
    />
    {gift ? (
      <GiftDetailsCard
        busy={address.busy}
        form={gift}
        missingZone={missingGiftZone}
        onChange={onGift}
        zones={address.zones}
      />
    ) : (
      <AddressSection {...address} />
    )}
  </>
);

/**
 * Checkout: the delivery address and zone, online or cash payment,
 * then `create_order` (which prices the fee from the zone) and, for online
 * payment, the hosted payment page. The order's page shows what happened.
 */
export const Checkout = () => {
  const t = useTranslations("app.checkout");
  const router = useRouter();
  const profile = useProfile();
  const cart = useCart();
  const settings = useStoreSettings();
  const zones = useDeliveryZones();
  const place = usePlaceOrder();
  const placeGift = usePlaceGift();
  const book = useAddressBook();
  const { address, setForm } = book;
  const [fieldErrors, setFieldErrors] = useState<AddressField[]>([]);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [useBulbs, setUseBulbs] = useState(false);
  // A gift goes to the chosen zone and is paid online (or with Bulbs).
  const [gift, setGift] = useState<GiftForm | null>(null);
  const [missingGiftZone, setMissingGiftZone] = useState(false);

  const set = (field: keyof AddressForm) => (value: string) =>
    setForm({ ...address, [field]: value });

  const {
    areas,
    availableBulbs,
    cash,
    paidWithBulbs,
    paymentOffered,
    paymentMethod,
    quote,
    summary,
    zone,
    zoneList,
  } = useCheckoutPricing({
    address: gift
      ? { ...address, governorate: "", zoneId: gift.zoneId }
      : address,
    cart,
    payment: gift ? "online" : book.payment,
    settings,
    useBulbs,
    zones,
  });
  const busy =
    place.isPending ||
    place.isSuccess ||
    placeGift.isPending ||
    placeGift.isSuccess;

  const afterPlaced = ({
    order,
    paymentError,
    url,
  }: {
    order: { id: string };
    paymentError: unknown;
    url: string | null;
  }) => {
    if (paymentError) {
      setCreatedOrderId(order.id);
      return;
    }
    // On the web the payment page has replaced this one; the apps open
    // it in the system browser, so show the order meanwhile.
    if (isNativeApp() || !url) {
      router.replace(orderPath(order.id));
    }
  };

  const submitGift = (form: GiftForm) => {
    setMissingGiftZone(!form.zoneId);
    if (!form.zoneId) {
      return;
    }
    placeGift.mutate(
      {
        deliveryZone: form.zoneId,
        hidePrice: form.hidePrice,
        message: form.message,
        useBulbs: quote?.bulbsUsed ?? 0,
      },
      {
        onError: (mutationError) => setError(toCheckoutError(mutationError)),
        onSuccess: afterPlaced,
      }
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (gift) {
      submitGift(gift);
      return;
    }
    const result = validateAddress(address, { areas, zones: zoneList });
    setFieldErrors(result.errors);
    if (!result.shipping) {
      return;
    }
    const request = {
      deliveryZone: result.zoneId,
      paymentMethod: paidWithBulbs ? ("online" as const) : paymentMethod,
      shipping: result.shipping,
      useBulbs: quote?.bulbsUsed ?? 0,
    };
    place.mutate(request, {
      onError: (mutationError) => setError(toCheckoutError(mutationError)),
      onSuccess: ({ order, paymentError, url }) => {
        book.afterOrder({
          paymentMethod: paymentOffered ? paymentMethod : null,
          shipping: result.shipping,
          zoneId: result.zoneId,
        });
        afterPlaced({ order, paymentError, url });
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
    profile.isPending ||
    book.loading;
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
              <WhereItGoes
                areas={areas}
                book={book}
                busy={busy}
                fieldErrors={fieldErrors}
                gift={gift}
                missingGiftZone={missingGiftZone}
                onChange={set}
                onGift={setGift}
                rentals={summary.lines.some((line) => isRentLine(line.item))}
                zone={zone}
                zones={zoneList}
              />
              <BulbsCard
                available={availableBulbs}
                busy={busy}
                onChange={setUseBulbs}
                use={useBulbs}
                using={quote?.bulbsUsed ?? 0}
              />
              {paymentOffered && !gift ? (
                <PaymentCard
                  busy={busy}
                  onChange={book.setPayment}
                  value={paymentMethod}
                />
              ) : null}
            </div>

            <SummaryCard
              busy={busy}
              cash={cash}
              error={
                <CheckoutErrorNote
                  error={error}
                  onPhoneVerified={() => setError(null)}
                  phone={address.phone}
                />
              }
              oneTap={gift ? null : book.oneTap(cash)}
              quote={quote ?? null}
              summary={summary}
            />
          </form>
        ) : null}
      </div>
    </>
  );
};
