"use client";

import { formatPrice, localized } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import {
  LIVE_OFFER_STATUSES,
  type MyOffer,
  useAnswerOffer,
  useMyOffers,
  useWithdrawOffer,
} from "@/lib/make-offer-queries";
import { productHref } from "./product-card";

/** Accept, decline or counter (once) the seller's counter. */
const AnswerCounter = ({ offer }: { readonly offer: MyOffer }) => {
  const t = useTranslations("app.offers.mine");
  const locale = useLocale() as Locale;
  const answer = useAnswerOffer();
  const [counter, setCounter] = useState("");
  const inputId = useId();
  const value = Number(counter);
  const canCounter = offer.buyer_counter === null;
  const validCounter =
    Number.isInteger(value) &&
    value > offer.buyer_amount &&
    value < offer.amount;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={answer.isPending}
          onClick={() => answer.mutate({ answer: "accept", target: offer.id })}
          size="sm"
        >
          {t("accept", { amount: formatPrice(offer.amount, locale) })}
        </Button>
        <Button
          disabled={answer.isPending}
          onClick={() => answer.mutate({ answer: "decline", target: offer.id })}
          size="sm"
          variant="outline"
        >
          {t("decline")}
        </Button>
      </div>
      {canCounter ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (validCounter) {
              answer.mutate({
                answer: "counter",
                counter: value,
                target: offer.id,
              });
            }
          }}
        >
          <label className="sr-only" htmlFor={inputId}>
            {t("counterLabel")}
          </label>
          <Input
            className="w-36"
            id={inputId}
            inputMode="numeric"
            onChange={(event) => setCounter(event.target.value)}
            placeholder={t("counterPlaceholder")}
            type="number"
            value={counter}
          />
          <Button
            disabled={!validCounter || answer.isPending}
            size="sm"
            type="submit"
            variant="outline"
          >
            {t("counter")}
          </Button>
        </form>
      ) : null}
      {answer.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};

const OfferRow = ({ offer }: { readonly offer: MyOffer }) => {
  const t = useTranslations("app.offers.mine");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const withdraw = useWithdrawOffer();
  const name = offer.product ? localized(offer.product, "name", locale) : "";
  const live = offer.status === "open" || offer.status === "countered";

  return (
    <li className="grid gap-2 py-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {offer.product ? (
          <Link
            className="font-medium hover:underline"
            href={productHref(offer.product.slug)}
          >
            {name}
          </Link>
        ) : null}
        <span className="text-muted-foreground">
          · {conditions(offer.condition)}
        </span>
        <Badge className="ms-auto" variant="secondary">
          {t(`status.${offer.status}`)}
        </Badge>
      </div>
      <p className="text-muted-foreground">
        {t("amounts", {
          offer: formatPrice(offer.buyer_counter ?? offer.buyer_amount, locale),
          price: formatPrice(offer.list_price, locale),
        })}
      </p>
      {offer.status === "countered" ? (
        <p>
          {t("countered", {
            amount: formatPrice(offer.amount, locale),
            time: formatDateTime(offer.expires_at, locale),
          })}
        </p>
      ) : null}
      {offer.status === "open" ? (
        <p>
          {t("waiting", { time: formatDateTime(offer.expires_at, locale) })}
        </p>
      ) : null}
      {offer.status === "accepted" && offer.cart_until ? (
        <p>
          {t("inCart", {
            amount: formatPrice(offer.amount, locale),
            time: formatDateTime(offer.cart_until, locale),
          })}{" "}
          <Link
            className="font-medium text-pink-text hover:underline"
            href="/cart"
          >
            {t("viewCart")}
          </Link>
        </p>
      ) : null}
      {offer.status === "countered" ? <AnswerCounter offer={offer} /> : null}
      {live ? (
        <Button
          className="justify-self-start"
          disabled={withdraw.isPending}
          onClick={() => withdraw.mutate(offer.id)}
          size="sm"
          variant="ghost"
        >
          {t("withdraw")}
        </Button>
      ) : null}
      {withdraw.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </li>
  );
};

/** Pass → Saved → Offers: the member's offers, live ones first. */
export const MyOffers = () => {
  const t = useTranslations("app.offers.mine");
  const offers = useMyOffers();
  const all = offers.data ?? [];
  if (all.length === 0) {
    return null;
  }
  const sorted = [
    ...all.filter((offer) => LIVE_OFFER_STATUSES.has(offer.status)),
    ...all.filter((offer) => !LIVE_OFFER_STATUSES.has(offer.status)),
  ];
  return (
    <section className="grid gap-2" id="offers">
      <h2 className="font-semibold text-lg">{t("title")}</h2>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      <ul className="divide-y">
        {sorted.map((offer) => (
          <OfferRow key={offer.id} offer={offer} />
        ))}
      </ul>
    </section>
  );
};
