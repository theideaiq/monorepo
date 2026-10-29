"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
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
import { type Locale, localePath } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { MoveLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import {
  ListingPhotos,
  ProblemLine,
} from "@/components/screens/member-listings";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  type Listing,
  useBuyListing,
  useListing,
  useListingPhotos,
  useListingsForSale,
} from "@/lib/member-listings";

/** The first photo of a listing, as a card cover. */
const Cover = ({
  path,
  title,
}: {
  readonly path: string | undefined;
  readonly title: string;
}) => {
  const url = useListingPhotos(path ? [path] : []).data?.[0];
  return url ? (
    // biome-ignore lint/performance/noImgElement: short-lived signed links to private photos
    <img
      alt={title}
      className="aspect-square w-full rounded-t-xl object-cover"
      height={240}
      src={url}
      width={240}
    />
  ) : (
    <div className="aspect-square w-full rounded-t-xl bg-muted" />
  );
};

/** Store → From people: live listings, newest first, with a title search. */
export const PeopleListings = () => {
  const t = useTranslations("app.people.store");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const [search, setSearch] = useState("");
  const listings = useListingsForSale({ search });
  const id = useId();

  return (
    <div className="grid gap-6">
      <div className="grid max-w-sm gap-1">
        <Label htmlFor={id}>{t("search")}</Label>
        <Input
          id={id}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
          type="search"
          value={search}
        />
      </div>
      {listings.isPending ? <SectionSpinner /> : null}
      {listings.isError ? (
        <ErrorState onRetry={() => listings.refetch()} />
      ) : null}
      {listings.data?.length === 0 ? (
        <p className="text-muted-foreground">{t("none")}</p>
      ) : null}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {(listings.data ?? []).map((listing) => (
          <li key={listing.id}>
            <Link
              className="block rounded-xl border bg-card transition hover:shadow-md"
              href={`/store/people/${listing.number}`}
            >
              <Cover path={listing.photos[0]} title={listing.title} />
              <div className="grid gap-1 p-3 text-sm">
                <span className="line-clamp-2 font-medium">
                  {listing.title}
                </span>
                <span>{formatPrice(listing.price, locale)}</span>
                <span className="text-muted-foreground text-xs">
                  {conditions(listing.condition)} ·{" "}
                  {t("by", { name: listing.first_name ?? "" })}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Buy at the price, or offer less where the seller allows it. */
const BuyBox = ({ listing }: { readonly listing: Listing }) => {
  const t = useTranslations("app.people.buy");
  const locale = useLocale() as Locale;
  const { user } = useAuth();
  const buy = useBuyListing();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const id = useId();

  if (!user) {
    return (
      <Link
        className="font-medium text-pink-text text-sm hover:underline"
        href={{
          pathname: "/sign-in",
          query: {
            return_to: localePath(locale, `/store/people/${listing.number}`),
          },
        }}
      >
        {t("signIn")}
      </Link>
    );
  }
  if (listing.mine) {
    return (
      <Link className="text-sm underline" href="/pass/selling#listings">
        {t("yours")}
      </Link>
    );
  }
  if (buy.isSuccess) {
    return (
      <p className="text-sm" role="status">
        {buy.data?.status === "accepted" ? t("bought") : t("offered")}{" "}
        <Link className="underline" href="/pass/selling#buying">
          {t("open")}
        </Link>
      </p>
    );
  }
  if (listing.status !== "active") {
    return null;
  }
  const offer = Number(amount);
  const offerOk = listing.price > offer && offer > 0;
  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <Label htmlFor={`${id}-note`}>{t("note")}</Label>
        <Input
          id={`${id}-note`}
          maxLength={1000}
          onChange={(event) => setNote(event.target.value)}
          value={note}
        />
      </div>
      <Button
        className="justify-self-start"
        disabled={buy.isPending}
        onClick={() => buy.mutate({ note, target: listing.id })}
      >
        {t("buy", { price: formatPrice(listing.price, locale) })}
      </Button>
      {listing.accepts_offers ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (offerOk) {
              buy.mutate({ amount: offer, note, target: listing.id });
            }
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor={`${id}-amount`}>{t("offerLabel")}</Label>
            <Input
              className="w-40"
              id={`${id}-amount`}
              inputMode="numeric"
              min={1}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              value={amount}
            />
          </div>
          <Button
            disabled={buy.isPending || !offerOk}
            type="submit"
            variant="outline"
          >
            {t("offer")}
          </Button>
        </form>
      ) : null}
      {buy.isError ? <ProblemLine error={buy.error} /> : null}
      <p className="text-muted-foreground text-xs">{t("cash")}</p>
    </div>
  );
};

/** Store → From people → one listing. */
export const PeopleListingScreen = ({
  number,
}: {
  readonly number: number;
}) => {
  const t = useTranslations("app.people.store");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const listing = useListing(number);

  if (listing.isPending) {
    return <SectionSpinner />;
  }
  if (listing.isError) {
    return <ErrorState onRetry={() => listing.refetch()} />;
  }
  if (!listing.data) {
    return <p className="text-muted-foreground">{t("gone")}</p>;
  }
  const item = listing.data;
  const live = item.status === "active";
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-2xl">{item.title}</CardTitle>
          {live ? null : (
            <Badge className="ms-auto" variant="secondary">
              {t(`status.${item.status}`)}
            </Badge>
          )}
        </div>
        <CardDescription>
          {conditions(item.condition)} ·{" "}
          {t("by", { name: item.first_name ?? "" })} ·{" "}
          {t("listed", { date: formatDateTime(item.created_at, locale) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ListingPhotos paths={item.photos} size="size-32" />
        <p className="font-semibold text-xl">
          {formatPrice(item.price, locale)}
          {item.accepts_offers ? (
            <span className="ms-2 font-normal text-muted-foreground text-sm">
              {t("offersAllowed")}
            </span>
          ) : null}
        </p>
        <p className="whitespace-pre-line">{item.description}</p>
        <BuyBox listing={item} />
        <p className="text-muted-foreground text-xs">
          {t("policy")}{" "}
          <Link className="underline" href="/legal/selling">
            {t("policyLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};

/** Back to Store → From people. */
export const BackToPeople = () => {
  const t = useTranslations("app.people.store");
  return (
    <Link
      className="mb-6 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
      href="/store/people"
    >
      <MoveLeft className="size-4 rtl:rotate-180" />
      {t("back")}
    </Link>
  );
};
