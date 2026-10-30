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
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import type { Locale } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { PrinterIcon, TruckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { ApiError } from "@/lib/api";
import { useSeller } from "@/lib/seller-queries";
import {
  type ShopLine,
  useLabel,
  useOutOfStock,
  useReadyLines,
  useShopLines,
  useShopLocations,
} from "@/lib/shop-order-queries";

/** Boxy statuses before the courier has collected the parcel. */
const BEFORE_PICKUP = new Set(["new", "scheduled"]);
const SIZES = ["S", "M", "L"] as const;

const LineRow = ({
  checked,
  line,
  onCheck,
  sellerId,
}: {
  readonly checked: boolean;
  readonly line: ShopLine;
  readonly onCheck?: (checked: boolean) => void;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopOrders");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const outOfStock = useOutOfStock(sellerId);
  const label = useLabel();
  const id = useId();
  const late =
    line.status === "waiting" &&
    line.ready_by &&
    new Date(line.ready_by) < new Date();

  return (
    <li className="flex flex-wrap items-start gap-3 p-3">
      {onCheck ? (
        <Checkbox
          aria-labelledby={`${id}-name`}
          checked={checked}
          onCheckedChange={(value) => onCheck(value === true)}
        />
      ) : null}
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="font-medium" id={`${id}-name`}>
          {locale === "ar" ? line.name_ar : line.name_en}
          <span className="text-muted-foreground">
            {" "}
            · {conditions(line.condition)} · ×{line.quantity}
          </span>
        </p>
        <p className="text-muted-foreground text-sm">
          {t("orderLine", {
            customer: line.customer,
            number: line.order_number,
          })}
        </p>
        <p className="text-sm">
          {t("money", {
            payout: formatPrice(line.seller_payout ?? 0, locale),
            price: formatPrice(line.unit_price * line.quantity, locale),
          })}
        </p>
        {line.status === "waiting" && line.ready_by ? (
          <p
            className={late ? "text-destructive text-sm" : "text-sm"}
            role={late ? "alert" : undefined}
          >
            {t(late ? "late" : "readyBy", {
              time: formatDateTime(line.ready_by, locale),
            })}
          </p>
        ) : null}
        {line.tracking_code ? (
          <p className="text-muted-foreground text-xs" dir="ltr">
            {line.tracking_code}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={line.status === "waiting" ? "default" : "secondary"}>
          {t(`status.${line.status}`)}
        </Badge>
        {line.status === "waiting" ? (
          <Button
            disabled={outOfStock.isPending}
            onClick={() => outOfStock.mutate(line.line_id)}
            size="sm"
            variant="outline"
          >
            {t("outOfStock")}
          </Button>
        ) : null}
        {line.shipment_id &&
        line.status === "ready" &&
        BEFORE_PICKUP.has(line.shipment_status ?? "") ? (
          <Button
            disabled={label.isPending}
            onClick={() => label.mutate(line.shipment_id ?? "")}
            size="sm"
            variant="outline"
          >
            <PrinterIcon aria-hidden="true" />
            {t("printLabel")}
          </Button>
        ) : null}
      </div>
      {outOfStock.isError || label.isError ? (
        <p className="w-full text-destructive text-sm" role="alert">
          {t("errors.failed")}
        </p>
      ) : null}
    </li>
  );
};

/** Choose waiting lines, a branch and a parcel size, then "Ready for pickup". */
const Waiting = ({
  lines,
  sellerId,
}: {
  readonly lines: ShopLine[];
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopOrders");
  const id = useId();
  const locations = useShopLocations(sellerId);
  const ready = useReadyLines(sellerId);
  const [chosen, setChosen] = useState<string[]>([]);
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const usable = (locations.data ?? []).filter(
    (item) => item.active && item.boxy_uid
  );
  const [branch, setBranch] = useState("");
  const location = branch || usable[0]?.id || "";

  if (lines.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noneWaiting")}</p>;
  }

  return (
    <div className="grid gap-4">
      <ul className="divide-y rounded-md border">
        {lines.map((line) => (
          <LineRow
            checked={chosen.includes(line.line_id)}
            key={line.line_id}
            line={line}
            onCheck={(checked) =>
              setChosen(
                checked
                  ? [...chosen, line.line_id]
                  : chosen.filter((item) => item !== line.line_id)
              )
            }
            sellerId={sellerId}
          />
        ))}
      </ul>
      {usable.length === 0 ? (
        <p className="text-sm">
          {t("noBranch")}{" "}
          <Link className="underline" href="/sell/settings#pickup">
            {t("addBranch")}
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-2">
            <Label htmlFor={`${id}-branch`}>{t("branch")}</Label>
            <Select onValueChange={setBranch} value={location}>
              <SelectTrigger className="w-56" id={`${id}-branch`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {usable.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-size`}>{t("size")}</Label>
            <Select
              onValueChange={(value) =>
                setSize(value as (typeof SIZES)[number])
              }
              value={size}
            >
              <SelectTrigger className="w-32" id={`${id}-size`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`sizes.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={ready.isPending || chosen.length === 0 || !location}
            onClick={() =>
              ready.mutate(
                { lines: chosen, location, size },
                { onSuccess: () => setChosen([]) }
              )
            }
          >
            <TruckIcon aria-hidden="true" />
            {t("ready", { count: String(chosen.length) })}
          </Button>
        </div>
      )}
      {ready.isSuccess ? (
        <p className="text-sm" role="status">
          {t(ready.data.pickupRequested ? "readyDone" : "readyNoPickup", {
            count: String(ready.data.parcels.length),
          })}
        </p>
      ) : null}
      {ready.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t(
            ready.error instanceof ApiError &&
              ready.error.code === "carrier_not_configured"
              ? "errors.carrier"
              : "errors.ready"
          )}
        </p>
      ) : null}
    </div>
  );
};

const OrdersBody = () => {
  const t = useTranslations("app.company.shopOrders");
  const { active } = useActiveOrganization();
  const shop = useSeller(active.id);
  const sellerId = shop.data?.seller.id ?? "";
  const lines = useShopLines(sellerId);

  if (shop.isPending || (sellerId && lines.isPending)) {
    return <SectionSpinner />;
  }
  if (shop.isError || lines.isError) {
    return (
      <ErrorState
        onRetry={() => (shop.isError ? shop.refetch() : lines.refetch())}
      />
    );
  }
  if (shop.data?.seller.status !== "approved") {
    return <p className="text-muted-foreground">{t("notApproved")}</p>;
  }

  const all = lines.data ?? [];
  const waiting = all.filter((line) => line.status === "waiting");
  const rest = all.filter((line) => line.status !== "waiting");

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("waitingTitle")}</CardTitle>
          <CardDescription>{t("waitingDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Waiting lines={waiting} sellerId={sellerId} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("sentTitle")}</CardTitle>
          <CardDescription>{t("sentDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {rest.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noneSent")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {rest.map((line) => (
                <LineRow
                  checked={false}
                  key={line.line_id}
                  line={line}
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
 * Partners → Selling → Orders: the shop's lines on The IDEA's orders. The
 * customer shows only as "first name · area"; the label printed for the
 * parcel is the only place with their phone and address.
 */
export const ShopOrders = () => (
  <BusinessShell feature="selling" page="orders">
    <OrdersBody />
  </BusinessShell>
);
