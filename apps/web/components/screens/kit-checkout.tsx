"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice, localized, type PaymentMethod } from "@repo/commerce";
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
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { ArrowLeftIcon, BanknoteIcon, LockIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  ContactCard,
  PaymentCard,
  resolveChoices,
  useCheckoutAreas,
} from "@/components/screens/checkout";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  type AddressField,
  type AddressForm,
  accountPhone,
  emptyAddress,
  validateAddress,
} from "@/lib/address";
import { type CheckoutError, toCheckoutError } from "@/lib/errors";
import {
  kitTotal,
  MAX_EXTRA_DAYS,
  useKitType,
  useKitWeekends,
} from "@/lib/kits";
import { orderPath, usePlaceKit } from "@/lib/order-checkout";
import { isNativeApp } from "@/lib/platform";
import { useProfile } from "@/lib/queries";
import {
  useDeliveryZones,
  useProducts,
  useStoreSettings,
} from "@/lib/store-queries";
import { useMyStudent } from "@/lib/student-queries";

type Weekend = ReturnType<typeof useKitWeekends>["data"] extends
  | (infer W)[]
  | undefined
  ? W
  : never;

/** The weekend (Thursday to Saturday) and how many days after it. */
const WhenCard = ({
  extraDays,
  onExtraDays,
  onWeekend,
  weekend,
  weekends,
}: {
  readonly extraDays: number;
  readonly onExtraDays: (days: number) => void;
  readonly onWeekend: (startsOn: string) => void;
  readonly weekend: string | null;
  readonly weekends: Weekend[];
}) => {
  const t = useTranslations("app.kits");
  const locale = useLocale() as Locale;
  const id = useId();
  const saturday = (startsOn: string) => {
    const day = new Date(`${startsOn}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + 2);
    return day.toISOString().slice(0, 10);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("when")}</CardTitle>
        <CardDescription>{t("whenHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <RadioGroup
          aria-label={t("when")}
          className="grid gap-2 sm:grid-cols-2"
          onValueChange={onWeekend}
          value={weekend ?? ""}
        >
          {weekends.map((item) => (
            <Label
              className="flex items-center gap-3 rounded-lg border p-3 font-normal has-data-[state=checked]:border-primary"
              htmlFor={`${id}-${item.startsOn}`}
              key={item.startsOn}
            >
              <RadioGroupItem
                disabled={item.unitsFree <= 0}
                id={`${id}-${item.startsOn}`}
                value={item.startsOn}
              />
              <span className="grid">
                <span>
                  {t("weekend", {
                    from: formatDate(item.startsOn, locale),
                    to: formatDate(saturday(item.startsOn), locale),
                  })}
                </span>
                <span className="text-muted-foreground text-xs">
                  {item.unitsFree > 0
                    ? t("free", { n: formatNumber(item.unitsFree, locale) })
                    : t("booked")}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-extra`}>{t("extraDays")}</Label>
          <Input
            className="w-24"
            dir="ltr"
            id={`${id}-extra`}
            inputMode="numeric"
            max={MAX_EXTRA_DAYS}
            min={0}
            onChange={(event) =>
              onExtraDays(
                Math.min(
                  MAX_EXTRA_DAYS,
                  Math.max(0, Number(event.target.value) || 0)
                )
              )
            }
            type="number"
            value={extraDays}
          />
        </div>
      </CardContent>
    </Card>
  );
};

/** The PS5 kit's games, chosen from the rental copies. */
const GamesCard = ({
  chosen,
  count,
  onChange,
}: {
  readonly chosen: string[];
  readonly count: number;
  readonly onChange: (games: string[]) => void;
}) => {
  const t = useTranslations("app.kits");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const products = useProducts({
    category: "games",
    kind: "rental",
    limit: 48,
    search: search.trim() || undefined,
  });
  const full = chosen.length >= count;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("games", { n: formatNumber(count, locale) })}</CardTitle>
        <CardDescription>
          {t("chosen", {
            count: formatNumber(count, locale),
            n: formatNumber(chosen.length, locale),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Input
          aria-label={t("searchGames")}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchGames")}
          type="search"
          value={search}
        />
        <ul className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
          {(products.data ?? []).map((product) => {
            const on = chosen.includes(product.id);
            return (
              <li key={product.id}>
                <Label className="flex items-center gap-2 font-normal">
                  <Checkbox
                    checked={on}
                    disabled={!on && full}
                    onCheckedChange={(value) =>
                      onChange(
                        value === true
                          ? [...chosen, product.id]
                          : chosen.filter((id) => id !== product.id)
                      )
                    }
                  />
                  {localized(product, "name", locale)}
                </Label>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

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

/** The weekend, extra days, deposit and what's paid now. */
const KitSummary = ({
  busy,
  cash,
  deposit,
  error,
  extraDays,
  name,
  ready,
  weekend,
}: {
  readonly busy: boolean;
  readonly cash: boolean;
  readonly deposit: number;
  readonly error: CheckoutError | null;
  readonly extraDays: number;
  readonly name: string;
  readonly ready: boolean;
  readonly weekend: Weekend | undefined;
}) => {
  const t = useTranslations("app.kits");
  const tCheckout = useTranslations("app.checkout");
  const locale = useLocale() as Locale;
  const total = kitTotal(weekend, extraDays) + deposit;
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
            label={t("weekendPrice")}
            value={weekend ? formatPrice(weekend.price, locale) : "—"}
          />
          {extraDays > 0 && weekend ? (
            <Row
              label={t("extraDaysPrice", {
                n: formatNumber(extraDays, locale),
              })}
              value={formatPrice(extraDays * weekend.extraDayPrice, locale)}
            />
          ) : null}
          {deposit > 0 ? (
            <Row label={t("deposit")} value={formatPrice(deposit, locale)} />
          ) : null}
          <Row label={t("delivery")} value={t("included")} />
          <div className="flex justify-between gap-3 border-t pt-2 font-medium">
            <dt>{t("total")}</dt>
            <dd className="tabular-nums">{weekend ? amount : "—"}</dd>
          </div>
        </dl>
        <ul className="grid gap-1 text-muted-foreground text-xs">
          <li>{deposit > 0 ? t("depositNote") : t("noDepositNote")}</li>
          <li>{t("adultsNote")}</li>
        </ul>
        {error ? (
          <p className="text-destructive" role="alert">
            {tCheckout(`errors.${error}`)}
          </p>
        ) : null}
        <Button disabled={busy || !ready} size="lg" type="submit">
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

/** The kit, its weekends and the store's options; delivery in Baghdad. */
const useKitData = (kit: string) => {
  const profile = useProfile();
  const type = useKitType(kit);
  const weekends = useKitWeekends(kit);
  const settings = useStoreSettings();
  const zones = useDeliveryZones();
  const queries = [type, weekends, settings, zones];
  return {
    failed: queries.some((query) => query.isError),
    loading: profile.isPending || queries.some((query) => query.isPending),
    profile: profile.data,
    retry: () => {
      for (const query of queries) {
        query.refetch();
      }
    },
    settings: settings.data,
    type: type.data,
    weekends: weekends.data ?? [],
    zones: (zones.data ?? []).filter((zone) => zone.governorate === "baghdad"),
  };
};

/**
 * Booking a game night kit: the weekend (and extra days), the PS5 kit's
 * games, the address in Baghdad and payment, then `book_kit()` and, for
 * online payment, the hosted payment page.
 */
export const KitCheckout = ({ kit }: { readonly kit: string }) => {
  const t = useTranslations("app.kits");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { user } = useAuth();
  const data = useKitData(kit);
  const place = usePlaceKit();
  // Verified students book without the deposit (book_kit() waives it).
  const isStudent = useMyStudent().data?.verified ?? false;
  const [startsOn, setStartsOn] = useState<string | null>(null);
  const [extraDays, setExtraDays] = useState(0);
  const [games, setGames] = useState<string[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>("online");
  const [form, setForm] = useState<AddressForm | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AddressField[]>([]);
  const [error, setError] = useState<CheckoutError | null>(null);

  const address: AddressForm = form ?? {
    ...emptyAddress(accountPhone(user?.phone)),
    fullName: data.profile?.full_name ?? "",
  };
  const set = (field: keyof AddressForm) => (value: string) =>
    setForm({ ...address, [field]: value });
  const weekend = data.weekends.find((item) => item.startsOn === startsOn);
  const { cash, cashOffered, paymentMethod, zone, zoneList } = resolveChoices({
    address,
    fulfilment: "delivery",
    payment,
    settings: data.settings,
    subtotal: kitTotal(weekend, extraDays),
    zones: data.zones,
  });
  const areas = useCheckoutAreas("delivery", zone);
  const busy = place.isPending || place.isSuccess;
  const { type } = data;
  const ready = Boolean(weekend && type && games.length === (type?.games ?? 0));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const result = validateAddress(address, {
      areas,
      fulfilment: "delivery",
      zones: zoneList,
    });
    setFieldErrors(result.errors);
    if (!(result.shipping && result.zoneId && startsOn && ready)) {
      return;
    }
    place.mutate(
      {
        deliveryZone: result.zoneId,
        extraDays,
        games,
        kit,
        paymentMethod,
        shipping: result.shipping,
        startsOn,
      },
      {
        onError: (mutationError) => setError(toCheckoutError(mutationError)),
        onSuccess: ({ order, paymentError, url }) => {
          if (paymentError || isNativeApp() || !url) {
            router.replace(orderPath(order.id));
          }
        },
      }
    );
  };

  return (
    <>
      <PageHeader title={type ? localized(type, "name", locale) : t("title")} />
      <div className="flex flex-1 flex-col gap-6">
        <Link
          className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
          href="/plus#kits"
        >
          <ArrowLeftIcon className="size-4 rtl:rotate-180" />
          {t("back")}
        </Link>
        {data.failed ? <ErrorState onRetry={data.retry} /> : null}
        {data.loading && !data.failed ? <SectionSpinner /> : null}
        {data.loading || data.failed || type ? null : (
          <p className="text-muted-foreground" role="status">
            {t("notFound")}
          </p>
        )}
        {type && !data.loading ? (
          <form
            className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]"
            noValidate
            onSubmit={submit}
          >
            <div className="grid gap-6">
              <p className="text-sm">
                {localized(type, "description", locale)}
              </p>
              <WhenCard
                extraDays={extraDays}
                onExtraDays={setExtraDays}
                onWeekend={setStartsOn}
                weekend={startsOn}
                weekends={data.weekends}
              />
              {type.games > 0 ? (
                <GamesCard
                  chosen={games}
                  count={type.games}
                  onChange={setGames}
                />
              ) : null}
              <ContactCard
                address={address}
                areas={areas}
                busy={busy}
                fieldErrors={fieldErrors}
                method="delivery"
                onChange={set}
                pickup={null}
                zone={zone}
                zones={zoneList}
              />
              {cashOffered ? (
                <PaymentCard
                  busy={busy}
                  method="delivery"
                  onChange={setPayment}
                  value={paymentMethod}
                />
              ) : null}
            </div>
            <KitSummary
              busy={busy}
              cash={cash}
              deposit={isStudent ? 0 : type.deposit}
              error={error}
              extraDays={extraDays}
              name={localized(type, "name", locale)}
              ready={ready}
              weekend={weekend}
            />
          </form>
        ) : null}
      </div>
    </>
  );
};
