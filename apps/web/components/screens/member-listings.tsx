"use client";

import { formatPrice, localized } from "@repo/commerce";
import type { Database } from "@repo/database";
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import {
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  listingRefusal,
  MAX_PHOTOS,
  MIN_PHOTOS,
  MIN_PRICE,
  type MyDeal,
  type MyListing,
  useCreateListing,
  useDealAction,
  useListingAction,
  useListingPhotos,
  useMyDeals,
  useMyListings,
  useSendDealMessage,
} from "@/lib/member-listings";
import { useDeliveryZones } from "@/lib/store-queries";

type Condition = Database["public"]["Enums"]["product_condition"];

const CONDITIONS: readonly Condition[] = [
  "new",
  "open_box",
  "used",
  "refurbished",
];

export type ListingProblem =
  | "adult"
  | "area"
  | "closed"
  | "duplicate"
  | "failed"
  | "identity"
  | "limit"
  | "own"
  | "phone"
  | "photos"
  | "price"
  | "suspended"
  | "waiting";

/** The database's refusals, by how their message starts. */
const PROBLEMS: [prefix: string, key: ListingProblem][] = [
  ["You need to be 18", "adult"],
  ["Verify your identity", "identity"],
  ["Verify your phone", "phone"],
  ["At most 20 live", "limit"],
  ["At most 10 offers", "waiting"],
  ["Add 3 to 8 photos", "photos"],
  ["Choose the area", "area"],
  ["The price is at least", "price"],
  ["You can't buy your own", "own"],
  ["You already have an offer", "duplicate"],
  ["This item is sold at its price", "price"],
  ["This item isn't for sale", "closed"],
  ["This offer", "closed"],
  ["Only ", "closed"],
  ["Account suspended", "suspended"],
];

export const listingProblem = (error: unknown): ListingProblem => {
  const message =
    listingRefusal(error) ??
    (typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "");
  return (
    PROBLEMS.find(([prefix]) => message.startsWith(prefix))?.[1] ?? "failed"
  );
};

/** What went wrong, with the way to fix it where there is one. */
export const ProblemLine = ({ error }: { readonly error: unknown }) => {
  const t = useTranslations("app.people.problems");
  const problem = listingProblem(error);
  return (
    <span className="text-destructive text-sm" role="alert">
      {t(problem)}{" "}
      {problem === "phone" ? (
        <Link className="underline" href="/pass/settings">
          {t("verifyPhone")}
        </Link>
      ) : null}
      {problem === "identity" ? (
        <Link className="underline" href="/pass/settings#verification">
          {t("verifyIdentity")}
        </Link>
      ) : null}
    </span>
  );
};

/** A listing's photos as small thumbnails. */
export const ListingPhotos = ({
  paths,
  size = "size-20",
}: {
  readonly paths: readonly string[];
  readonly size?: string;
}) => {
  const t = useTranslations("app.people");
  const locale = useLocale() as Locale;
  const photos = useListingPhotos(paths).data ?? [];
  return (
    <ul className="flex flex-wrap gap-2">
      {photos.map((url, index) =>
        url ? (
          <li key={paths[index]}>
            {/* biome-ignore lint/performance/noImgElement: short-lived signed links to private photos */}
            <img
              alt={t("photo", { number: formatNumber(index + 1, locale) })}
              className={`${size} rounded-md border object-cover`}
              height={80}
              src={url}
              width={80}
            />
          </li>
        ) : null
      )}
    </ul>
  );
};

interface FormState {
  acceptsOffers: boolean;
  condition: Condition;
  description: string;
  governorate: string;
  photos: File[];
  price: string;
  title: string;
}

const EMPTY: FormState = {
  acceptsOffers: false,
  condition: "used",
  description: "",
  governorate: "",
  photos: [],
  price: "",
  title: "",
};

const formReady = (form: FormState) =>
  form.title.trim().length >= 2 &&
  form.description.trim().length >= 10 &&
  form.governorate !== "" &&
  Number(form.price) >= MIN_PRICE &&
  form.photos.length >= MIN_PHOTOS &&
  form.photos.length <= MAX_PHOTOS;

/** One choice per governorate the Store delivers to. */
const useAreas = () => {
  const zones = useDeliveryZones().data ?? [];
  return [
    ...new Map(
      zones.flatMap((zone) =>
        zone.governorate
          ? [
              [
                zone.governorate,
                { ...zone, governorate: zone.governorate },
              ] as const,
            ]
          : []
      )
    ).values(),
  ];
};

/** The condition and area pickers of the listing form. */
const ConditionAndArea = ({
  form,
  id,
  setForm,
}: {
  readonly form: FormState;
  readonly id: string;
  readonly setForm: (form: FormState) => void;
}) => {
  const t = useTranslations("app.people.list");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const areas = useAreas();
  return (
    <div className="flex flex-wrap gap-4">
      <div className="grid gap-1">
        <Label htmlFor={`${id}-condition`}>{t("condition")}</Label>
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          id={`${id}-condition`}
          onChange={(event) =>
            setForm({ ...form, condition: event.target.value as Condition })
          }
          value={form.condition}
        >
          {CONDITIONS.map((condition) => (
            <option key={condition} value={condition}>
              {conditions(condition)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${id}-area`}>{t("area")}</Label>
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          id={`${id}-area`}
          onChange={(event) =>
            setForm({ ...form, governorate: event.target.value })
          }
          value={form.governorate}
        >
          <option value="">{t("chooseArea")}</option>
          {areas.map((zone) => (
            <option key={zone.governorate} value={zone.governorate}>
              {localized(zone, "name", locale)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${id}-price`}>{t("price")}</Label>
        <Input
          className="w-40"
          id={`${id}-price`}
          inputMode="numeric"
          min={MIN_PRICE}
          onChange={(event) => setForm({ ...form, price: event.target.value })}
          type="number"
          value={form.price}
        />
      </div>
    </div>
  );
};

/** List one of your own things: photos, condition, area and price. */
const ListItem = () => {
  const t = useTranslations("app.people.list");
  const locale = useLocale() as Locale;
  const create = useCreateListing();
  const [form, setForm] = useState<FormState>(EMPTY);
  const id = useId();
  const ready = formReady(form);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ready) {
      create.mutate(
        {
          ...form,
          description: form.description.trim(),
          price: Number(form.price),
          title: form.title.trim(),
        },
        { onSuccess: () => setForm(EMPTY) }
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-title`}>{t("item")}</Label>
            <Input
              id={`${id}-title`}
              maxLength={200}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              value={form.title}
            />
          </div>
          <ConditionAndArea form={form} id={id} setForm={setForm} />
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={form.acceptsOffers}
              onChange={(event) =>
                setForm({ ...form, acceptsOffers: event.target.checked })
              }
              type="checkbox"
            />
            {t("acceptsOffers")}
          </label>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-description`}>{t("details")}</Label>
            <Textarea
              id={`${id}-description`}
              maxLength={2000}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              rows={4}
              value={form.description}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-photos`}>{t("photos")}</Label>
            <Input
              accept="image/png,image/jpeg,image/webp"
              id={`${id}-photos`}
              multiple
              onChange={(event) =>
                setForm({
                  ...form,
                  photos: Array.from(event.target.files ?? []).slice(
                    0,
                    MAX_PHOTOS
                  ),
                })
              }
              type="file"
            />
            <p className="text-muted-foreground text-xs">
              {t("photosHint", {
                count: formatNumber(form.photos.length, locale),
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!ready || create.isPending} type="submit">
              {create.isPending ? t("listing") : t("list")}
            </Button>
            {create.isSuccess ? (
              <span className="text-muted-foreground text-sm" role="status">
                {t("listed")}
              </span>
            ) : null}
            {create.isError ? <ProblemLine error={create.error} /> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

/** The messages on one deal, and a box to write to the other side. */
const DealMessages = ({ deal }: { readonly deal: MyDeal }) => {
  const t = useTranslations("app.people.messages");
  const locale = useLocale() as Locale;
  const send = useSendDealMessage();
  const [body, setBody] = useState("");
  const id = useId();
  const open = deal.status === "sent" || deal.status === "accepted";
  const mine = (fromSeller: boolean) => fromSeller === deal.selling;

  return (
    <div className="grid gap-2 rounded-md bg-muted/50 p-3">
      {deal.messages.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t("none")}</p>
      ) : (
        <ol className="grid gap-2">
          {deal.messages.map((message) => (
            <li className="grid gap-0.5 text-sm" key={message.id}>
              <span className="text-muted-foreground text-xs">
                {mine(message.from_seller)
                  ? t("you")
                  : (deal.other_first_name ?? t("them"))}{" "}
                · {formatDateTime(message.created_at, locale)}
              </span>
              <span className="whitespace-pre-line">{message.body}</span>
            </li>
          ))}
        </ol>
      )}
      {open ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim()) {
              send.mutate(
                { body: body.trim(), target: deal.id },
                { onSuccess: () => setBody("") }
              );
            }
          }}
        >
          <div className="grid min-w-48 flex-1 gap-1">
            <Label className="sr-only" htmlFor={id}>
              {t("label")}
            </Label>
            <Input
              id={id}
              maxLength={2000}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("placeholder")}
              value={body}
            />
          </div>
          <Button
            disabled={!body.trim() || send.isPending}
            size="sm"
            type="submit"
            variant="outline"
          >
            {t("send")}
          </Button>
        </form>
      ) : null}
      <p className="text-muted-foreground text-xs">{t("private")}</p>
    </div>
  );
};

/** The buttons a deal offers its seller or buyer, by its state. */
const DealActions = ({ deal }: { readonly deal: MyDeal }) => {
  const t = useTranslations("app.people.deal");
  const act = useDealAction();
  const run = (action: Parameters<typeof act.mutate>[0]["action"]) =>
    act.mutate({ action, target: deal.id });
  const waiting = deal.status === "sent";
  const agreed = deal.status === "accepted";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {waiting && deal.selling ? (
        <>
          <Button
            disabled={act.isPending}
            onClick={() => run("accept")}
            size="sm"
          >
            {t("accept")}
          </Button>
          <Button
            disabled={act.isPending}
            onClick={() => run("decline")}
            size="sm"
            variant="outline"
          >
            {t("decline")}
          </Button>
        </>
      ) : null}
      {waiting && !deal.selling ? (
        <Button
          disabled={act.isPending}
          onClick={() => run("withdraw")}
          size="sm"
          variant="outline"
        >
          {t("withdraw")}
        </Button>
      ) : null}
      {agreed && deal.selling ? (
        <Button disabled={act.isPending} onClick={() => run("sold")} size="sm">
          {t("sold")}
        </Button>
      ) : null}
      {agreed ? (
        <Button
          disabled={act.isPending}
          onClick={() => run("callOff")}
          size="sm"
          variant="ghost"
        >
          {t("callOff")}
        </Button>
      ) : null}
      {act.isError ? <ProblemLine error={act.error} /> : null}
    </div>
  );
};

/** One deal: who, how much, its state, what to do and the messages. */
const DealRow = ({ deal }: { readonly deal: MyDeal }) => {
  const t = useTranslations("app.people.deal");
  const locale = useLocale() as Locale;
  const name = deal.other_first_name ?? t("someone");

  return (
    <li className="grid gap-2 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">
          {t(deal.kind === "buy" ? "buys" : "offers", {
            amount: formatPrice(deal.amount, locale),
            name,
          })}
        </p>
        <Badge className="ms-auto" variant="secondary">
          {t(`status.${deal.status}`)}
        </Badge>
      </div>
      {deal.note ? <p className="whitespace-pre-line">{deal.note}</p> : null}
      {deal.status === "sent" ? (
        <p className="text-muted-foreground text-xs">
          {t("until", { time: formatDateTime(deal.expires_at, locale) })}
        </p>
      ) : null}
      {deal.status === "accepted" ? (
        <p>{t(deal.selling ? "agreedSeller" : "agreedBuyer")}</p>
      ) : null}
      <DealActions deal={deal} />
      <DealMessages deal={deal} />
    </li>
  );
};

/** One of your listings with the offers on it. */
const MyListingCard = ({
  deals,
  listing,
}: {
  readonly deals: readonly MyDeal[];
  readonly listing: MyListing;
}) => {
  const t = useTranslations("app.people.listing");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const action = useListingAction();
  const live = listing.status === "active" || listing.status === "reserved";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{listing.title}</CardTitle>
          <Badge className="ms-auto" variant="secondary">
            {t(`status.${listing.status}`)}
          </Badge>
        </div>
        <CardDescription>
          {conditions(listing.condition)} · {formatPrice(listing.price, locale)}
          {listing.accepts_offers ? ` · ${t("offersAllowed")}` : ""}
          {listing.status === "active"
            ? ` · ${t("until", { time: formatDateTime(listing.expires_at, locale) })}`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ListingPhotos paths={listing.photos} />
        {listing.removed_reason ? (
          <p className="text-destructive text-sm">
            {t("takenDown", { reason: listing.removed_reason })}
          </p>
        ) : null}
        {listing.status === "active" ? (
          <Link
            className="text-sm underline"
            href={`/store/people/${listing.number}`}
          >
            {t("view")}
          </Link>
        ) : null}
        {deals.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {live ? t("waiting") : t("noOffers")}
          </p>
        ) : (
          <ul className="divide-y">
            {deals.map((deal) => (
              <DealRow deal={deal} key={deal.id} />
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          {listing.status === "expired" ? (
            <Button
              disabled={action.isPending}
              onClick={() =>
                action.mutate({ action: "renew", target: listing.id })
              }
              size="sm"
            >
              {t("renew")}
            </Button>
          ) : null}
          {live || listing.status === "expired" ? (
            <Button
              disabled={action.isPending}
              onClick={() =>
                action.mutate({ action: "remove", target: listing.id })
              }
              size="sm"
              variant="ghost"
            >
              {t("remove")}
            </Button>
          ) : null}
          {action.isError ? <ProblemLine error={action.error} /> : null}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Selling your own things to other people: the listing form, then your
 * listings with their offers.
 */
export const SellYourself = () => {
  const t = useTranslations("app.people");
  const listings = useMyListings();
  const deals = useMyDeals().data ?? [];

  return (
    <section className="grid gap-4" id="listings">
      <h2 className="font-semibold text-lg">{t("sellTitle")}</h2>
      <p className="text-muted-foreground text-sm">{t("sellIntro")}</p>
      <ListItem />
      {listings.isPending ? <SectionSpinner /> : null}
      {listings.isError ? (
        <ErrorState onRetry={() => listings.refetch()} />
      ) : null}
      {(listings.data ?? []).map((listing) => (
        <MyListingCard
          deals={deals.filter(
            (deal) => deal.selling && deal.listing_id === listing.id
          )}
          key={listing.id}
          listing={listing}
        />
      ))}
    </section>
  );
};

/** What you're buying from other people: your offers and agreed sales. */
export const Buying = () => {
  const t = useTranslations("app.people");
  const deals = useMyDeals();
  const buying = (deals.data ?? []).filter((deal) => !deal.selling);

  return (
    <section className="grid gap-4" id="buying">
      <h2 className="font-semibold text-lg">{t("buyingTitle")}</h2>
      {deals.isPending ? <SectionSpinner /> : null}
      {deals.isError ? <ErrorState onRetry={() => deals.refetch()} /> : null}
      {deals.data && buying.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("buyingNone")}{" "}
          <Link className="underline" href="/store/people">
            {t("browse")}
          </Link>
        </p>
      ) : null}
      {buying.length > 0 ? (
        <Card>
          <CardContent>
            <ul className="divide-y">
              {buying.map((deal) => (
                <li className="grid gap-1 pt-3" key={deal.id}>
                  <Link
                    className="font-medium underline"
                    href={`/store/people/${deal.listing_number}`}
                  >
                    {deal.title}
                  </Link>
                  <ul>
                    <DealRow deal={deal} />
                  </ul>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
};
