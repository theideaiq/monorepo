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
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useSeller } from "@/lib/seller-queries";
import {
  type ParcelBack,
  type ShopReturn,
  useConfirmCondition,
  useConfirmParcelBack,
  useParcelsBack,
  useRespondToReturn,
  useReturnPhotos,
  useShopReturns,
} from "@/lib/shop-return-queries";

const Photos = ({ paths }: { readonly paths: readonly string[] }) => {
  const t = useTranslations("app.company.shopReturns");
  const urls = useReturnPhotos(paths);
  if (paths.length === 0) {
    return null;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {(urls.data ?? []).map((url, index) => (
        <li key={url}>
          <a href={url} rel="noopener noreferrer" target="_blank">
            {/* biome-ignore lint/performance/noImgElement: signed private links */}
            <img
              alt={t("photo", { number: String(index + 1) })}
              className="size-20 rounded-md border object-cover"
              height={80}
              src={url}
              width={80}
            />
          </a>
        </li>
      ))}
    </ul>
  );
};

/** Accept, or dispute with a reason; or, once it's back, check it. */
const Answer = ({
  item,
  sellerId,
}: {
  readonly item: ShopReturn;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopReturns");
  const respond = useRespondToReturn(sellerId);
  const check = useConfirmCondition(sellerId);
  const [note, setNote] = useState("");
  const noteId = useId();
  const checking = item.status === "received";
  const pending = respond.isPending || check.isPending;

  if (!(checking || item.status === "requested")) {
    return null;
  }
  return (
    <div className="grid gap-2">
      <Label htmlFor={noteId}>
        {t(checking ? "problemNote" : "disputeNote")}
      </Label>
      <Textarea
        id={noteId}
        maxLength={2000}
        onChange={(event) => setNote(event.target.value)}
        value={note}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            checking
              ? check.mutate({ note: "", ok: true, target: item.return_id })
              : respond.mutate({ accept: true, note, target: item.return_id })
          }
          size="sm"
        >
          {t(checking ? "itemFine" : "accept")}
        </Button>
        <Button
          disabled={pending || note.trim() === ""}
          onClick={() =>
            checking
              ? check.mutate({ note, ok: false, target: item.return_id })
              : respond.mutate({ accept: false, note, target: item.return_id })
          }
          size="sm"
          variant="outline"
        >
          {t(checking ? "itemProblem" : "dispute")}
        </Button>
      </div>
      {respond.isError || check.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};

const ReturnRow = ({
  item,
  sellerId,
}: {
  readonly item: ShopReturn;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopReturns");
  const reasons = useTranslations("app.orders.returns.reasons");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const due = item.status === "received" ? item.check_by : item.respond_by;

  return (
    <li className="grid gap-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">
          {locale === "ar" ? item.name_ar : item.name_en}
          <span className="text-muted-foreground">
            {" "}
            · {conditions(item.condition)} · ×{item.quantity}
          </span>
        </p>
        <Badge className="ms-auto" variant="secondary">
          {t(`status.${item.status}`)}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">
        {t("line", {
          customer: item.customer,
          number: String(item.number),
          order: item.order_number,
        })}
      </p>
      <p className="text-sm">
        {reasons(item.reason)}
        {item.unopened ? ` · ${t("unopened")}` : ""}
        {" · "}
        {formatPrice(item.unit_price * item.quantity, locale)}
      </p>
      {item.details ? <p className="text-sm">{item.details}</p> : null}
      <Photos paths={item.photos} />
      {(item.status === "requested" || item.status === "received") && due ? (
        <p className="text-sm">
          {t("answerBy", { time: formatDateTime(due, locale) })}
        </p>
      ) : null}
      {item.staff_note ? (
        <p className="text-muted-foreground text-sm">
          {t("staffNote", { note: item.staff_note })}
        </p>
      ) : null}
      {item.fault === "shop" && item.collection_fee ? (
        <p className="text-muted-foreground text-sm">
          {t("feeYours", {
            fee: formatPrice(item.collection_fee, locale),
          })}
        </p>
      ) : null}
      <Answer item={item} sellerId={sellerId} />
    </li>
  );
};

const ParcelRow = ({
  parcel,
  sellerId,
}: {
  readonly parcel: ParcelBack;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopReturns");
  const locale = useLocale() as Locale;
  const confirm = useConfirmParcelBack(sellerId);
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <div className="grid min-w-0 flex-1 gap-1 text-sm">
        <p className="font-medium">
          {t("parcelLine", {
            customer: parcel.customer,
            order: parcel.order_number,
          })}
        </p>
        <p className="text-muted-foreground">{parcel.items}</p>
        {parcel.returned_at ? (
          <p className="text-muted-foreground">
            {t("returnedOn", {
              time: formatDateTime(parcel.returned_at, locale),
            })}
          </p>
        ) : null}
      </div>
      <Button
        disabled={confirm.isPending}
        onClick={() => confirm.mutate(parcel.shipment_id)}
        size="sm"
      >
        {t("parcelBack")}
      </Button>
    </li>
  );
};

const ReturnsBody = () => {
  const t = useTranslations("app.company.shopReturns");
  const { active } = useActiveOrganization();
  const shop = useSeller(active.id);
  const sellerId = shop.data?.seller.id ?? "";
  const returns = useShopReturns(sellerId);
  const parcels = useParcelsBack(sellerId);

  if (shop.isPending || (sellerId && returns.isPending)) {
    return <SectionSpinner />;
  }
  if (shop.isError || returns.isError) {
    return (
      <ErrorState
        onRetry={() => (shop.isError ? shop.refetch() : returns.refetch())}
      />
    );
  }
  if (shop.data?.seller.status !== "approved") {
    return <p className="text-muted-foreground">{t("notApproved")}</p>;
  }

  const all = returns.data ?? [];
  const yours = all.filter(
    (item) => item.status === "requested" || item.status === "received"
  );
  const rest = all.filter((item) => !yours.includes(item));
  const back = parcels.data ?? [];

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("waitingTitle")}</CardTitle>
          <CardDescription>{t("waitingDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {yours.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noneWaiting")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {yours.map((item) => (
                <ReturnRow
                  item={item}
                  key={item.return_id}
                  sellerId={sellerId}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {back.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("parcelsTitle")}</CardTitle>
            <CardDescription>{t("parcelsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-md border">
              {back.map((parcel) => (
                <ParcelRow
                  key={parcel.shipment_id}
                  parcel={parcel}
                  sellerId={sellerId}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{t("otherTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rest.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noneOther")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {rest.map((item) => (
                <ReturnRow
                  item={item}
                  key={item.return_id}
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
 * Partners → Selling → Returns: requests to answer within 48 hours (silence
 * accepts), items to check once they're back, and refused parcels to
 * confirm. Disputes go to The IDEA, which decides.
 */
export const ShopReturns = () => (
  <BusinessShell feature="selling">
    <ReturnsBody />
  </BusinessShell>
);
