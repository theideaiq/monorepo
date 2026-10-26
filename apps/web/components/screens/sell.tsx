"use client";

import { formatPrice } from "@repo/commerce";
import type {
  TradeInCategory,
  TradeInCondition,
  TradeInPayout,
  TradeInStatus,
} from "@repo/database";
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
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { AgeAwareError } from "@/components/age-aware-error";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  useMyTradeIns,
  useRespondToTradeInOffer,
  useSubmitTradeIn,
  useTradeInPhotoUrls,
  useWithdrawTradeIn,
} from "@/lib/trade-in-queries";
import {
  canRespond,
  canWithdrawTradeIn,
  emptyTradeInDraft,
  MAX_TRADE_IN_PHOTOS,
  PHOTO_TYPES,
  type TradeInDraft,
  type TradeInProblem,
  tradeInCategories,
  tradeInConditions,
  tradeInPayouts,
  validateTradeIn,
} from "@/lib/trade-ins";

const STATUS_BADGE: Record<
  TradeInStatus,
  "default" | "destructive" | "outline" | "secondary"
> = {
  accepted: "default",
  completed: "default",
  declined: "outline",
  offer_made: "destructive",
  rejected: "outline",
  reviewing: "secondary",
  submitted: "secondary",
  withdrawn: "outline",
};

const SellForm = () => {
  const t = useTranslations("app.sell");
  const tTrade = useTranslations("store.tradeIn");
  const locale = useLocale();
  const id = useId();
  const submit = useSubmitTradeIn();
  const [draft, setDraft] = useState<TradeInDraft>(() => emptyTradeInDraft());
  const [problem, setProblem] = useState<TradeInProblem | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  const update = (patch: Partial<TradeInDraft>) => {
    setSubmitted(false);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateTradeIn(draft);
    setProblem(found);
    if (found) {
      return;
    }
    submit.mutate(draft, {
      onSuccess: () => {
        setDraft(emptyTradeInDraft(draft.phone));
        setSubmitted(true);
        // A new file input: browsers don't let scripts clear the old one.
        setFileKey((current) => current + 1);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("form.title")}</CardTitle>
        <CardDescription>{t("form.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" noValidate onSubmit={onSubmit}>
          <fieldset className="grid gap-4" disabled={submit.isPending}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`${id}-category`}>{t("form.category")}</Label>
                <Select
                  onValueChange={(value) =>
                    update({ category: value as TradeInCategory })
                  }
                  value={draft.category}
                >
                  <SelectTrigger className="w-full" id={`${id}-category`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tradeInCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {tTrade(`category.${category}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${id}-condition`}>{t("form.condition")}</Label>
                <Select
                  onValueChange={(value) =>
                    update({ condition: value as TradeInCondition })
                  }
                  value={draft.condition}
                >
                  <SelectTrigger className="w-full" id={`${id}-condition`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tradeInConditions.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {tTrade(`condition.${condition}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-title`}>{t("form.itemTitle")}</Label>
              <Input
                id={`${id}-title`}
                maxLength={200}
                onChange={(event) => update({ title: event.target.value })}
                placeholder={t("form.itemTitlePlaceholder")}
                value={draft.title}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-description`}>
                {t("form.itemDescription")}
              </Label>
              <Textarea
                className="min-h-28"
                id={`${id}-description`}
                maxLength={4000}
                onChange={(event) =>
                  update({ description: event.target.value })
                }
                placeholder={t("form.itemDescriptionPlaceholder")}
                value={draft.description}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`${id}-price`}>{t("form.askingPrice")}</Label>
                <Input
                  dir="ltr"
                  id={`${id}-price`}
                  inputMode="numeric"
                  maxLength={15}
                  onChange={(event) =>
                    update({ askingPrice: event.target.value })
                  }
                  value={draft.askingPrice}
                />
                <p className="text-muted-foreground text-xs">
                  {t("form.askingPriceHint")}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${id}-phone`}>{t("form.phone")}</Label>
                <Input
                  autoComplete="tel"
                  dir="ltr"
                  id={`${id}-phone`}
                  inputMode="tel"
                  maxLength={20}
                  onChange={(event) => update({ phone: event.target.value })}
                  placeholder={t("form.phonePlaceholder")}
                  type="tel"
                  value={draft.phone}
                />
                <p className="text-muted-foreground text-xs">
                  {t("form.phoneHint")}
                </p>
              </div>
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-2 font-medium text-sm">
                {t("form.payout")}
              </legend>
              <RadioGroup
                className="flex flex-wrap gap-6"
                onValueChange={(value) =>
                  update({ payout: value as TradeInPayout })
                }
                value={draft.payout}
              >
                {tradeInPayouts.map((payout) => (
                  <div className="flex items-center gap-2" key={payout}>
                    <RadioGroupItem id={`${id}-${payout}`} value={payout} />
                    <Label htmlFor={`${id}-${payout}`}>
                      {tTrade(`payout.${payout}`)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </fieldset>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-photos`}>{t("form.photos")}</Label>
              <Input
                accept={PHOTO_TYPES.join(",")}
                id={`${id}-photos`}
                key={fileKey}
                multiple
                onChange={(event) =>
                  update({ photos: [...(event.target.files ?? [])] })
                }
                type="file"
              />
              <p className="text-muted-foreground text-xs">
                {draft.photos.length
                  ? t("form.photosChosen", {
                      count: formatNumber(draft.photos.length, locale),
                      max: formatNumber(MAX_TRADE_IN_PHOTOS, locale),
                    })
                  : t("form.photosHint", {
                      max: formatNumber(MAX_TRADE_IN_PHOTOS, locale),
                    })}
              </p>
            </div>
          </fieldset>
          {problem ? (
            <p className="text-destructive text-sm" role="alert">
              {t(`problems.${problem}`, {
                max: formatNumber(MAX_TRADE_IN_PHOTOS, locale),
              })}
            </p>
          ) : null}
          {submit.isError ? (
            <AgeAwareError error={submit.error} fallback={t("form.failed")} />
          ) : null}
          {submitted ? (
            <p className="text-sm text-success" role="status">
              {t("form.submitted")}
            </p>
          ) : null}
          <Button
            className="justify-self-start"
            disabled={submit.isPending}
            type="submit"
          >
            {submit.isPending ? t("form.submitting") : t("form.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const Photos = ({ paths }: { readonly paths: string[] }) => {
  const t = useTranslations("app.sell.list");
  const locale = useLocale();
  const urls = useTradeInPhotoUrls(paths);
  if (!(paths.length && urls.data)) {
    return null;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {urls.data.map((url, index) =>
        url ? (
          <li key={paths[index]}>
            <a href={url} rel="noopener noreferrer" target="_blank">
              {/* biome-ignore lint/performance/noImgElement: signed, short-lived URL */}
              <img
                alt={t("photo", { number: formatNumber(index + 1, locale) })}
                className="size-16 rounded-md border object-cover"
                height={64}
                src={url}
                width={64}
              />
            </a>
          </li>
        ) : null
      )}
    </ul>
  );
};

type TradeInRequest = NonNullable<
  ReturnType<typeof useMyTradeIns>["data"]
>[number];

interface RequestItemProps {
  readonly busy: boolean;
  readonly onRespond: (accept: boolean) => void;
  readonly onWithdraw: () => void;
  readonly request: TradeInRequest;
  readonly withdrawing: boolean;
}

/** One request: what it is, its status, our offer and what the customer can do. */
const RequestItem = ({
  busy,
  onRespond,
  onWithdraw,
  request,
  withdrawing,
}: RequestItemProps) => {
  const t = useTranslations("app.sell.list");
  const tTrade = useTranslations("store.tradeIn");
  const locale = useLocale();
  const offer =
    request.status === "rejected" || request.status === "withdrawn"
      ? null
      : request.offer_amount;

  return (
    <li className="grid gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <span className="font-medium">{request.title}</span>
          <span className="text-muted-foreground text-xs">
            {t("meta", {
              category: tTrade(`category.${request.category}`),
              date: formatDate(request.created_at, locale),
              number: String(request.number),
            })}
          </span>
          <span className="text-muted-foreground text-xs">
            {tTrade(`condition.${request.condition}`)} ·{" "}
            {tTrade(`payout.${request.payout}`)}
            {request.asking_price === null
              ? null
              : ` · ${t("asking", {
                  price: formatPrice(request.asking_price, locale),
                })}`}
          </span>
        </div>
        <Badge variant={STATUS_BADGE[request.status]}>
          {tTrade(`status.${request.status}`)}
        </Badge>
      </div>
      <Photos paths={request.photos} />
      {offer === null ? null : (
        <div className="grid gap-1 rounded-md bg-muted p-3 text-sm">
          <p className="font-medium">
            {t("offer", {
              amount: formatPrice(offer, locale),
            })}
          </p>
          {request.offer_note ? (
            <p className="whitespace-pre-line">{request.offer_note}</p>
          ) : null}
        </div>
      )}
      {request.status === "rejected" && request.offer_note ? (
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="mb-1 font-medium text-xs">{t("note")}</p>
          <p className="whitespace-pre-line">{request.offer_note}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {canRespond(request.status) ? (
          <>
            <Button disabled={busy} onClick={() => onRespond(true)} size="sm">
              {t("accept")}
            </Button>
            <Button
              disabled={busy}
              onClick={() => onRespond(false)}
              size="sm"
              variant="outline"
            >
              {t("decline")}
            </Button>
          </>
        ) : null}
        {canWithdrawTradeIn(request.status) ? (
          <Button
            disabled={busy}
            onClick={onWithdraw}
            size="sm"
            variant="ghost"
          >
            {withdrawing ? t("withdrawing") : t("withdraw")}
          </Button>
        ) : null}
      </div>
    </li>
  );
};

const MyRequests = () => {
  const t = useTranslations("app.sell.list");
  const requests = useMyTradeIns();
  const respond = useRespondToTradeInOffer();
  const withdraw = useWithdrawTradeIn();
  const busy = respond.isPending || withdraw.isPending;

  return (
    <section className="grid gap-4">
      <h2 className="font-semibold text-lg">{t("title")}</h2>
      {requests.isPending ? <SectionSpinner /> : null}
      {requests.isError ? (
        <ErrorState onRetry={() => requests.refetch()} />
      ) : null}
      {requests.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : null}
      {requests.data?.length ? (
        <ul className="divide-y rounded-lg border">
          {requests.data.map((request) => (
            <RequestItem
              busy={busy}
              key={request.id}
              onRespond={(accept) => respond.mutate({ accept, id: request.id })}
              onWithdraw={() => withdraw.mutate(request.id)}
              request={request}
              withdrawing={
                withdraw.isPending && withdraw.variables === request.id
              }
            />
          ))}
        </ul>
      ) : null}
      {respond.isError || withdraw.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("actionFailed")}
        </p>
      ) : null}
    </section>
  );
};

/**
 * Sell to us, under the orders on Your Pass → Orders: offer The IDEA an
 * item for cash or store credit, and the offers made so far.
 */
export const Sell = () => {
  const t = useTranslations("app.sell");

  return (
    <section className="flex max-w-3xl scroll-mt-24 flex-col gap-8" id="sell">
      <div className="grid gap-1">
        <h2 className="font-semibold text-xl">{t("title")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <SellForm />
      <MyRequests />
    </section>
  );
};
