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
import { PageHeader } from "@/components/page-header";
import { Buying, SellYourself } from "@/components/screens/member-listings";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  MAX_PHOTOS,
  MIN_PHOTOS,
  type MySellOffer,
  type MySellRequest,
  sellRefusal,
  useAnswerSellOffer,
  useCancelSellOffer,
  useCloseSellRequest,
  useCreateSellRequest,
  useMySellRequests,
  useSellPhotos,
  useSendSellMessage,
} from "@/lib/sell-requests";
import { useDeliveryZones } from "@/lib/store-queries";

type Condition = Database["public"]["Enums"]["product_condition"];

const CONDITIONS: readonly Condition[] = [
  "new",
  "open_box",
  "used",
  "refurbished",
];

type Problem =
  | "adult"
  | "area"
  | "failed"
  | "limit"
  | "phone"
  | "photos"
  | "closed";

/** The database's refusals, by how their message starts. */
const PROBLEMS: [prefix: string, key: Problem][] = [
  ["You need to be 18", "adult"],
  ["Verify your phone", "phone"],
  ["At most 5 open", "limit"],
  ["Add 3 to 8 photos", "photos"],
  ["Choose the area", "area"],
  ["This offer", "closed"],
  ["This request", "closed"],
];

const problemOf = (error: unknown): Problem => {
  const message = sellRefusal(error) ?? "";
  return (
    PROBLEMS.find(([prefix]) => message.startsWith(prefix))?.[1] ?? "failed"
  );
};

interface FormState {
  condition: Condition;
  description: string;
  governorate: string;
  photos: File[];
  title: string;
}

const EMPTY: FormState = {
  condition: "used",
  description: "",
  governorate: "",
  photos: [],
  title: "",
};

/** Describe an item, with photos and its area, and ask shops for offers. */
const AskForOffers = () => {
  const t = useTranslations("app.selling.ask");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const zones = useDeliveryZones().data ?? [];
  const create = useCreateSellRequest();
  const [form, setForm] = useState<FormState>(EMPTY);
  const id = useId();
  // One choice per governorate.
  const areas = [
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
  const ready =
    form.title.trim().length >= 2 &&
    form.description.trim().length >= 10 &&
    form.governorate !== "" &&
    form.photos.length >= MIN_PHOTOS &&
    form.photos.length <= MAX_PHOTOS;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ready) {
      create.mutate(
        {
          ...form,
          description: form.description.trim(),
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
          <div className="flex flex-wrap gap-4">
            <div className="grid gap-1">
              <Label htmlFor={`${id}-condition`}>{t("condition")}</Label>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                id={`${id}-condition`}
                onChange={(event) =>
                  setForm({
                    ...form,
                    condition: event.target.value as Condition,
                  })
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
          </div>
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
              {create.isPending ? t("sending") : t("send")}
            </Button>
            {create.isSuccess ? (
              <span className="text-muted-foreground text-sm" role="status">
                {t("sent")}
              </span>
            ) : null}
            {create.isError ? (
              <span className="text-destructive text-sm" role="alert">
                {t(`problems.${problemOf(create.error)}`)}{" "}
                {problemOf(create.error) === "phone" ? (
                  <Link className="underline" href="/pass/settings">
                    {t("verifyPhone")}
                  </Link>
                ) : null}
              </span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

/** The messages on one offer, and a box to write to the shop. */
const Messages = ({ offer }: { readonly offer: MySellOffer }) => {
  const t = useTranslations("app.selling.messages");
  const locale = useLocale() as Locale;
  const send = useSendSellMessage();
  const [body, setBody] = useState("");
  const id = useId();
  const open = offer.status === "sent" || offer.status === "accepted";
  const messages = [...offer.messages].sort((a, b) => a.id - b.id);

  return (
    <div className="grid gap-2 rounded-md bg-muted/50 p-3">
      {messages.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t("none")}</p>
      ) : (
        <ol className="grid gap-2">
          {messages.map((message) => (
            <li className="grid gap-0.5 text-sm" key={message.id}>
              <span className="text-muted-foreground text-xs">
                {message.from_shop ? t("shop") : t("you")} ·{" "}
                {formatDateTime(message.created_at, locale)}
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
                { body: body.trim(), target: offer.id },
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

/** One shop's offer: what it pays and how, its state and the answers. */
const OfferRow = ({
  offer,
  requestOpen,
}: {
  readonly offer: MySellOffer;
  readonly requestOpen: boolean;
}) => {
  const t = useTranslations("app.selling.offer");
  const locale = useLocale() as Locale;
  const answer = useAnswerSellOffer();
  const cancel = useCancelSellOffer();
  const waiting = offer.status === "sent" && requestOpen;

  return (
    <li className="grid gap-2 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">
          {t("from", {
            amount: formatPrice(offer.amount, locale),
            shop: offer.seller?.name ?? "",
          })}
        </p>
        <Badge className="ms-auto" variant="secondary">
          {t(`status.${offer.status}`)}
        </Badge>
      </div>
      <p className="text-muted-foreground">
        {t(`check.${offer.check_method as "collect" | "drop_off"}`)} ·{" "}
        {t(`pay.${offer.pay_method as "cash" | "transfer"}`)}
      </p>
      {offer.note ? <p className="whitespace-pre-line">{offer.note}</p> : null}
      {waiting ? (
        <p className="text-muted-foreground text-xs">
          {t("until", { time: formatDateTime(offer.expires_at, locale) })}
        </p>
      ) : null}
      {waiting ? (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={answer.isPending}
            onClick={() => answer.mutate({ accept: true, target: offer.id })}
            size="sm"
          >
            {t("accept")}
          </Button>
          <Button
            disabled={answer.isPending}
            onClick={() => answer.mutate({ accept: false, target: offer.id })}
            size="sm"
            variant="outline"
          >
            {t("decline")}
          </Button>
        </div>
      ) : null}
      {offer.status === "accepted" ? (
        <div className="grid gap-2">
          <p>{t("accepted")}</p>
          <Button
            className="justify-self-start"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(offer.id)}
            size="sm"
            variant="ghost"
          >
            {t("callOff")}
          </Button>
        </div>
      ) : null}
      {answer.isError || cancel.isError ? (
        <p className="text-destructive" role="alert">
          {t("failed")}
        </p>
      ) : null}
      <Messages offer={offer} />
    </li>
  );
};

/** One request: the item, its photos, the offers and closing it. */
const RequestCard = ({ request }: { readonly request: MySellRequest }) => {
  const t = useTranslations("app.selling.request");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const photos = useSellPhotos(request.photos).data ?? [];
  const close = useCloseSellRequest();
  const open = request.status === "open";
  const offers = [...request.offers].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{request.title}</CardTitle>
          <Badge className="ms-auto" variant="secondary">
            {t(`status.${request.status}`)}
          </Badge>
        </div>
        <CardDescription>
          {conditions(request.condition)} ·{" "}
          {open
            ? t("openUntil", {
                time: formatDateTime(request.expires_at, locale),
              })
            : t("number", { number: String(request.number) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="flex flex-wrap gap-2">
          {photos.map((url, index) =>
            url ? (
              <li key={request.photos[index]}>
                {/* biome-ignore lint/performance/noImgElement: short-lived signed links to private photos */}
                <img
                  alt={t("photo", { number: formatNumber(index + 1, locale) })}
                  className="size-20 rounded-md border object-cover"
                  height={80}
                  src={url}
                  width={80}
                />
              </li>
            ) : null
          )}
        </ul>
        <p className="whitespace-pre-line text-muted-foreground text-sm">
          {request.description}
        </p>
        {offers.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {open ? t("waiting") : t("noOffers")}
          </p>
        ) : (
          <ul className="divide-y">
            {offers.map((offer) => (
              <OfferRow key={offer.id} offer={offer} requestOpen={open} />
            ))}
          </ul>
        )}
        {open ? (
          <Button
            className="justify-self-start"
            disabled={close.isPending}
            onClick={() => close.mutate(request.id)}
            size="sm"
            variant="ghost"
          >
            {t("close")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};

/**
 * Your Pass → Selling: sell your own things to other people, follow what
 * you're buying from them, and ask shops for offers; every hand-over is
 * arranged in messages.
 */
export const Selling = () => {
  const t = useTranslations("app.selling");
  const requests = useMySellRequests();

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-6">
        <p className="text-muted-foreground">{t("intro")}</p>
        <SellYourself />
        <Buying />
        <h2 className="font-semibold text-lg">{t("askTitle")}</h2>
        <AskForOffers />
        <section className="grid gap-4" id="offers">
          <h2 className="font-semibold text-lg">{t("yours")}</h2>
          {requests.isPending ? <SectionSpinner /> : null}
          {requests.isError ? (
            <ErrorState onRetry={() => requests.refetch()} />
          ) : null}
          {requests.data?.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("none")}</p>
          ) : null}
          {(requests.data ?? []).map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </section>
      </div>
    </>
  );
};
