"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice, localized, planName } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { localePath } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { GiftIcon, SparklesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ContactCard, useCheckoutAreas } from "@/components/screens/checkout";
import { SectionSpinner } from "@/components/states";
import { CheckoutErrorNote } from "@/components/store/checkout-error";
import { ProductImage } from "@/components/store/product-image";
import {
  type AddressField,
  type AddressForm,
  accountPhone,
  emptyAddress,
  governorateName,
  validateAddress,
} from "@/lib/address";
import { type GiftError, toGiftError } from "@/lib/errors";
import { type GiftDetails, useClaimGift, useGiftPreview } from "@/lib/gifts";
import { useDeliveryZones } from "@/lib/store-queries";

/** Who it's from, the message and what's inside (prices unless hidden). */
const GiftContents = ({ gift }: { readonly gift: GiftDetails }) => {
  const t = useTranslations("web.gift");
  const locale = useLocale();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GiftIcon className="size-5" />
          {gift.from ? t("from", { name: gift.from }) : t("fromSomeone")}
        </CardTitle>
        {gift.message ? (
          <CardDescription className="whitespace-pre-line text-base">
            {gift.message}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4">
        {gift.plus ? (
          <p className="flex items-center gap-2 font-medium text-sm">
            <SparklesIcon className="size-4" />
            {t("plusMonths", {
              count: gift.plus.months,
              months: formatNumber(gift.plus.months, locale),
              plan: planName(gift.plus, locale),
            })}
          </p>
        ) : null}
        <ul className="grid gap-3">
          {gift.items.map((item) => (
            <li
              className="flex items-center gap-3 text-sm"
              key={`${item.slug}-${item.name_en}`}
            >
              <ProductImage
                alt={localized(item, "name", locale)}
                className="size-16 shrink-0"
                path={item.image}
                sizes="4rem"
              />
              <span className="grid min-w-0 flex-1 gap-0.5">
                {item.slug ? (
                  <Link
                    className="font-medium hover:underline"
                    href={`/store/${item.slug}`}
                  >
                    {localized(item, "name", locale)}
                  </Link>
                ) : (
                  <span className="font-medium">
                    {localized(item, "name", locale)}
                  </span>
                )}
                <span className="text-muted-foreground text-xs tabular-nums">
                  × {formatNumber(item.quantity, locale)}
                </span>
              </span>
              {item.unit_price === null ? null : (
                <span className="text-muted-foreground tabular-nums">
                  {formatPrice(item.unit_price, locale)}
                </span>
              )}
            </li>
          ))}
        </ul>
        {gift.total === null ? null : (
          <p className="text-muted-foreground text-sm">
            {t("worth", { amount: formatPrice(gift.total, locale) })}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

/** Why claiming failed; Plus problems link to joining Plus. */
const ClaimError = ({ error }: { readonly error: GiftError }) => {
  const t = useTranslations("web.gift");
  const tErrors = useTranslations("web.gift.errors");
  const joining = error === "plusHome" || error === "plusFull";
  return (
    <div className="grid gap-2">
      <p className="text-destructive text-sm" role="alert">
        {tErrors(error)}
      </p>
      {joining ? (
        <Button asChild className="justify-self-start" variant="outline">
          <Link href="/plus#join">{t("joinPlus")}</Link>
        </Button>
      ) : null}
    </div>
  );
};

/** Claimed: the link is spent, so success is shown from here. */
const Claimed = ({ plus }: { readonly plus: boolean }) => {
  const t = useTranslations("web.gift");
  return (
    <div className="grid gap-3">
      <p className="font-medium" role="status">
        {t(plus ? "claimedPlus" : "claimed")}
      </p>
      <Button asChild className="justify-self-start" variant="outline">
        <Link href={plus ? "/plus#yours" : "/pass/orders#gifts"}>
          {t(plus ? "yourPlus" : "yourGifts")}
        </Link>
      </Button>
    </div>
  );
};

/** Nothing to deliver (only Plus months): one tap adds them to the Pass. */
const ClaimPlus = ({ token }: { readonly token: string }) => {
  const t = useTranslations("web.gift");
  const claim = useClaimGift(token);
  const [error, setError] = useState<GiftError | null>(null);
  if (claim.isSuccess) {
    return <Claimed plus />;
  }
  return (
    <div className="grid gap-4">
      <p className="text-sm">{t("claimPlusIntro")}</p>
      {error ? <ClaimError error={error} /> : null}
      <Button
        className="justify-self-start"
        disabled={claim.isPending}
        onClick={() => {
          setError(null);
          claim.mutate(null, {
            onError: (claimError) => setError(toGiftError(claimError)),
          });
        }}
        size="lg"
        type="button"
      >
        {claim.isPending ? t("claiming") : t("claimPlus")}
      </Button>
    </div>
  );
};

/** The recipient's address, in the area the sender chose. */
const ClaimForm = ({
  gift,
  token,
}: {
  readonly gift: GiftDetails;
  readonly token: string;
}) => {
  const t = useTranslations("web.gift");
  const locale = useLocale();
  const { user } = useAuth();
  const zones = useDeliveryZones();
  const claim = useClaimGift(token);
  const zoneList = (zones.data ?? []).filter(({ id }) => id === gift.zone_id);
  const [address, setAddress] = useState<AddressForm>(() => ({
    ...emptyAddress(accountPhone(user?.phone)),
    zoneId: gift.zone_id ?? "",
  }));
  const [fieldErrors, setFieldErrors] = useState<AddressField[]>([]);
  const [error, setError] = useState<GiftError | null>(null);
  const zone = zoneList.find(({ id }) => id === address.zoneId);
  const areas = useCheckoutAreas(zone);
  const busy = claim.isPending;

  // Claiming spends the link, so success is shown from here.
  if (claim.isSuccess) {
    return <Claimed plus={false} />;
  }
  if (zones.isPending) {
    return <SectionSpinner />;
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const result = validateAddress(address, { areas, zones: zoneList });
    setFieldErrors(result.errors);
    if (!result.shipping) {
      return;
    }
    claim.mutate(result.shipping, {
      onError: (claimError) => setError(toGiftError(claimError)),
    });
  };

  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <p className="text-sm">
        {t("claimIntro", {
          area: governorateName(gift.governorate ?? "", locale),
        })}
      </p>
      <ContactCard
        address={address}
        areas={areas}
        busy={busy}
        fieldErrors={fieldErrors}
        onChange={(field) => (value) =>
          setAddress({ ...address, [field]: value })
        }
        onLocation={(location) => setAddress({ ...address, location })}
        zone={zone}
        zones={zoneList}
      />
      {error === "phoneUnverified" ? (
        <CheckoutErrorNote
          error="phoneUnverified"
          onPhoneVerified={() => setError(null)}
          phone={address.phone}
        />
      ) : null}
      {error && error !== "phoneUnverified" ? (
        <ClaimError error={error} />
      ) : null}
      <Button className="justify-self-start" disabled={busy} size="lg">
        {busy ? t("claiming") : t("claim")}
      </Button>
    </form>
  );
};

/**
 * /gift/<token>: what was sent and by whom; the recipient signs in and
 * gives their address, then it's delivered to them.
 */
export const GiftScreen = ({ token }: { readonly token: string }) => {
  const t = useTranslations("web.gift");
  const tErrors = useTranslations("web.gift.errors");
  const locale = useLocale();
  const { loading, user } = useAuth();
  const preview = useGiftPreview(token);

  if (preview.isPending || loading) {
    return <SectionSpinner />;
  }
  if (preview.isError || !preview.data) {
    return (
      <>
        <PageHeader title={t("title")} />
        <p className="text-muted-foreground" role="status">
          {tErrors(preview.isError ? toGiftError(preview.error) : "notFound")}
        </p>
      </>
    );
  }
  const gift = preview.data;

  let action: ReactNode;
  if (!gift.ready) {
    action = <p className="text-muted-foreground">{t("notReady")}</p>;
  } else if (user) {
    action = gift.ships ? (
      <ClaimForm gift={gift} token={token} />
    ) : (
      <ClaimPlus token={token} />
    );
  } else {
    action = (
      <div className="grid gap-3">
        <p className="text-muted-foreground">{t("signInHint")}</p>
        <Button asChild className="justify-self-start" size="lg">
          <Link
            href={{
              pathname: "/sign-in",
              query: {
                return_to: localePath(
                  locale,
                  `/gift/${encodeURIComponent(token)}`
                ),
              },
            }}
          >
            {t("signIn")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="grid gap-6">
        <GiftContents gift={gift} />
        {action}
      </div>
    </>
  );
};
