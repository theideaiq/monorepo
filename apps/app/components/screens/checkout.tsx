"use client";

import { useAuth } from "@repo/auth/provider";
import {
  describeAttributes,
  formatPrice,
  governorates,
  localized,
} from "@repo/commerce";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatNumber } from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { ArrowLeftIcon, LockIcon } from "lucide-react";
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
import { useCart, useStoreSettings } from "@/lib/store-queries";

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

/**
 * Checkout: the delivery address, then `create_order` and the hosted
 * payment page. The order's page shows what happened afterwards.
 */
export const Checkout = () => {
  const t = useTranslations("app.checkout");
  const locale = useLocale();
  const id = useId();
  const router = useRouter();
  const { user } = useAuth();
  const profile = useProfile();
  const cart = useCart();
  const settings = useStoreSettings();
  const place = usePlaceOrder();
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

  const summary =
    cart.data && settings.data ? summarizeCart(cart.data, settings.data) : null;
  const busy = place.isPending || place.isSuccess;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const result = validateAddress(address);
    setFieldErrors(result.errors);
    if (!result.shipping) {
      return;
    }
    place.mutate(result.shipping, {
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

  const fieldError = (field: AddressField) =>
    fieldErrors.includes(field) ? t(`fieldErrors.${field}`) : null;

  const describedBy = (field: AddressField) =>
    fieldErrors.includes(field) ? `${id}-${field}-error` : undefined;

  if (createdOrderId) {
    return (
      <>
        <PageHeader title={t("title")} />
        <div className="flex max-w-xl flex-1 flex-col gap-4 p-4 pt-0">
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

  const loading = cart.isPending || settings.isPending || profile.isPending;
  const failed = cart.isError || settings.isError;
  const empty = summary !== null && summary.lines.length === 0 && !busy;

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
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
                    htmlFor={`${id}-governorate`}
                    label={t("address.governorate")}
                  >
                    <Select
                      onValueChange={set("governorate")}
                      value={address.governorate}
                    >
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
                        {governorates.map((governorate) => (
                          <SelectItem
                            key={governorate.id}
                            value={governorate.id}
                          >
                            {locale === "en" ? governorate.en : governorate.ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field
                    htmlFor={`${id}-city`}
                    label={t("address.city")}
                    optional
                  >
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
                  <div className="sm:col-span-2">
                    <Field
                      htmlFor={`${id}-notes`}
                      label={t("address.notes")}
                      optional
                    >
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
                <Button
                  disabled={busy || !summary.canCheckout}
                  size="lg"
                  type="submit"
                >
                  {busy
                    ? t("placing")
                    : t("placeOrder", {
                        amount: formatPrice(summary.totals.total, locale),
                      })}
                </Button>
                <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <LockIcon className="size-3.5" />
                  {t("secure")}
                </p>
              </CardContent>
            </Card>
          </form>
        ) : null}
      </div>
    </>
  );
};
