"use client";

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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import {
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  type OpenSellRequest,
  type ShopSellOffer,
  type ShopSellOfferItem,
  useMakeSellOffer,
  useOpenSellRequests,
  useSellOfferAction,
  useSellPhotos,
  useSendSellMessage,
  useShopSellOfferItems,
  useShopSellOffers,
} from "@/lib/sell-offer-queries";
import { useSeller } from "@/lib/seller-queries";

/** The item's photos, from short-lived signed links. */
const Photos = ({ paths }: { readonly paths: readonly string[] }) => {
  const t = useTranslations("app.company.shopGetOffers");
  const locale = useLocale() as Locale;
  const urls = useSellPhotos(paths).data ?? [];
  return (
    <ul className="flex flex-wrap gap-2">
      {urls.map((url, index) =>
        url ? (
          <li key={paths[index]}>
            <a href={url} rel="noopener noreferrer" target="_blank">
              {/* biome-ignore lint/performance/noImgElement: short-lived signed links to private photos */}
              <img
                alt={t("photo", { number: formatNumber(index + 1, locale) })}
                className="size-20 rounded-md border object-cover"
                height={80}
                src={url}
                width={80}
              />
            </a>
          </li>
        ) : null
      )}
    </ul>
  );
};

/** An amount, how the shop checks the item and pays, and a note. */
const OfferForm = ({
  request,
  sellerId,
}: {
  readonly request: OpenSellRequest;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopGetOffers.form");
  const make = useMakeSellOffer(sellerId);
  const [amount, setAmount] = useState("");
  const [checkMethod, setCheckMethod] = useState<"collect" | "drop_off">(
    "collect"
  );
  const [payMethod, setPayMethod] = useState<"cash" | "transfer">("cash");
  const [note, setNote] = useState("");
  const id = useId();
  const value = Number(amount);
  const valid = Number.isInteger(value) && value > 0;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (valid) {
      make.mutate({
        amount: value,
        checkMethod,
        note: note.trim(),
        payMethod,
        requestId: request.id,
      });
    }
  };

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label htmlFor={`${id}-amount`}>{t("amount")}</Label>
          <Input
            className="w-36"
            id={`${id}-amount`}
            inputMode="numeric"
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            value={amount}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${id}-check`}>{t("check")}</Label>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            id={`${id}-check`}
            onChange={(event) =>
              setCheckMethod(event.target.value as "collect" | "drop_off")
            }
            value={checkMethod}
          >
            <option value="collect">{t("collect")}</option>
            <option value="drop_off">{t("dropOff")}</option>
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${id}-pay`}>{t("pay")}</Label>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            id={`${id}-pay`}
            onChange={(event) =>
              setPayMethod(event.target.value as "cash" | "transfer")
            }
            value={payMethod}
          >
            <option value="cash">{t("cash")}</option>
            <option value="transfer">{t("transfer")}</option>
          </select>
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${id}-note`}>{t("note")}</Label>
        <Textarea
          id={`${id}-note`}
          maxLength={1000}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          value={note}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!valid || make.isPending} size="sm" type="submit">
          {make.isPending ? t("sending") : t("send")}
        </Button>
        {make.isError ? (
          <span className="text-destructive text-sm" role="alert">
            {t("failed")}
          </span>
        ) : null}
      </div>
    </form>
  );
};

/** One member's item: what it is, its photos, and the shop's offer. */
const RequestRow = ({
  canManage,
  request,
  sellerId,
}: {
  readonly canManage: boolean;
  readonly request: OpenSellRequest;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopGetOffers");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  return (
    <li className="grid gap-3 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">
          {request.title}
          <span className="text-muted-foreground">
            {" "}
            · {conditions(request.condition)}
          </span>
        </p>
        <span className="ms-auto text-muted-foreground text-xs">
          {t("who", {
            area: request.governorate,
            name: request.first_name ?? "",
          })}
        </span>
      </div>
      <Photos paths={request.photos} />
      <p className="whitespace-pre-line text-muted-foreground">
        {request.description}
      </p>
      <p className="text-muted-foreground text-xs">
        {t("openUntil", { time: formatDateTime(request.expires_at, locale) })}
      </p>
      {request.offer_id ? (
        <p>
          {t("yourOffer", {
            amount: formatPrice(request.offer_amount ?? 0, locale),
          })}
        </p>
      ) : null}
      {canManage && !request.offer_id ? (
        <OfferForm request={request} sellerId={sellerId} />
      ) : null}
    </li>
  );
};

/** Messages with the member about one offer. */
const Messages = ({
  offer,
  sellerId,
}: {
  readonly offer: ShopSellOffer;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopGetOffers.messages");
  const locale = useLocale() as Locale;
  const send = useSendSellMessage(sellerId);
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
            <li className="grid gap-0.5" key={message.id}>
              <span className="text-muted-foreground text-xs">
                {message.from_shop ? t("shop") : t("member")} ·{" "}
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
          <Label className="sr-only" htmlFor={id}>
            {t("label")}
          </Label>
          <Input
            className="min-w-48 flex-1"
            id={id}
            maxLength={2000}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("placeholder")}
            value={body}
          />
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
    </div>
  );
};

/** Withdraw a waiting offer; after acceptance, mark it done or call it off. */
const OfferActions = ({
  offer,
  sellerId,
}: {
  readonly offer: ShopSellOffer;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopGetOffers");
  const act = useSellOfferAction(sellerId);
  return (
    <div className="flex flex-wrap gap-2">
      {offer.status === "sent" ? (
        <Button
          disabled={act.isPending}
          onClick={() => act.mutate({ action: "withdraw", target: offer.id })}
          size="sm"
          variant="ghost"
        >
          {t("withdraw")}
        </Button>
      ) : null}
      {offer.status === "accepted" ? (
        <>
          <Button
            disabled={act.isPending}
            onClick={() => act.mutate({ action: "done", target: offer.id })}
            size="sm"
          >
            {t("done")}
          </Button>
          <Button
            disabled={act.isPending}
            onClick={() => act.mutate({ action: "callOff", target: offer.id })}
            size="sm"
            variant="ghost"
          >
            {t("callOff")}
          </Button>
        </>
      ) : null}
      {act.isError ? (
        <span className="text-destructive text-sm" role="alert">
          {t("form.failed")}
        </span>
      ) : null}
    </div>
  );
};

/** One of the shop's offers, with the item it's for. */
const OfferRow = ({
  canManage,
  item,
  offer,
  sellerId,
}: {
  readonly canManage: boolean;
  readonly item: ShopSellOfferItem | undefined;
  readonly offer: ShopSellOffer;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopGetOffers");
  const locale = useLocale() as Locale;
  return (
    <li className="grid gap-2 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">
          {item?.title ?? ""}
          <span className="text-muted-foreground">
            {" "}
            · {formatPrice(offer.amount, locale)}
          </span>
        </p>
        <Badge className="ms-auto" variant="secondary">
          {t(`status.${offer.status}`)}
        </Badge>
      </div>
      {item ? (
        <p className="text-muted-foreground text-xs">
          {t("who", { area: item.governorate, name: item.first_name ?? "" })}
        </p>
      ) : null}
      {offer.status === "accepted" ? <p>{t("accepted")}</p> : null}
      {canManage ? <OfferActions offer={offer} sellerId={sellerId} /> : null}
      <Messages offer={offer} sellerId={sellerId} />
    </li>
  );
};

const GetOffersBody = () => {
  const t = useTranslations("app.company.shopGetOffers");
  const { active, canManage } = useActiveOrganization();
  const shop = useSeller(active.id);
  const sellerId = shop.data?.seller.id ?? "";
  const requests = useOpenSellRequests(sellerId);
  const offers = useShopSellOffers(sellerId);
  const items = useShopSellOfferItems(sellerId);

  if (
    shop.isPending ||
    (sellerId && (requests.isPending || offers.isPending))
  ) {
    return <SectionSpinner />;
  }
  if (shop.isError || requests.isError || offers.isError) {
    return <ErrorState onRetry={() => shop.refetch()} />;
  }
  if (shop.data?.seller.status !== "approved") {
    return <p className="text-muted-foreground">{t("notApproved")}</p>;
  }
  const itemFor = (offer: ShopSellOffer) =>
    (items.data ?? []).find((item) => item.offer_id === offer.id);

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("openTitle")}</CardTitle>
          <CardDescription>{t("openDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {(requests.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noneOpen")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {(requests.data ?? []).map((request) => (
                <RequestRow
                  canManage={canManage}
                  key={request.id}
                  request={request}
                  sellerId={sellerId}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("offersTitle")}</CardTitle>
          <CardDescription>{t("offersDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {(offers.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noneOffers")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {(offers.data ?? []).map((offer) => (
                <OfferRow
                  canManage={canManage}
                  item={itemFor(offer)}
                  key={offer.id}
                  offer={offer}
                  sellerId={sellerId}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Partners → Selling → Get offers: members' items to make an offer on (the
 * member stays anonymous), the shop's offers, messages and finished sales.
 */
export const ShopGetOffers = () => (
  <BusinessShell feature="selling">
    <GetOffersBody />
  </BusinessShell>
);
