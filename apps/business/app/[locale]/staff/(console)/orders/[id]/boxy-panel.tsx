"use client";

import type { Tables } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import type { Locale } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, SelectField } from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import {
  cancelBoxyShipment,
  getBoxyLabel,
  refreshBoxyShipment,
  sendWithBoxy,
} from "../actions";

export type Shipment = Pick<
  Tables<"shipments">,
  | "action_required"
  | "cash_amount"
  | "delivered_at"
  | "fee"
  | "fragile"
  | "history"
  | "pickup_id"
  | "returned_at"
  | "size"
  | "status"
  | "status_title"
  | "synced_at"
  | "tracking_code"
  | "tracking_url"
>;

interface HistoryStep {
  at: string | null;
  message: string | null;
  status: string;
  title: string;
}

/** Statuses in which Boxy can still cancel the parcel (before pick-up). */
const CANCELLABLE = new Set(["new", "scheduled"]);

/**
 * The label Boxy sent: a PDF (base64) is downloaded at once; a link to one
 * is returned for the panel to show (opening it after the request would be
 * blocked as a pop-up).
 */
const takeLabel = (
  data: Record<string, unknown> | undefined,
  fileName: string
): string | null => {
  if (typeof data?.url === "string" && data.url.startsWith("https://")) {
    return data.url;
  }
  if (typeof data?.pdf === "string") {
    const bytes = Uint8Array.from(atob(data.pdf), (char) => char.charCodeAt(0));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([bytes], { type: "application/pdf" })
    );
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return null;
};

/** Size, fragile and the button that sends the order with Boxy. */
const SendForm = ({
  addressReady,
  orderId,
}: {
  readonly addressReady: boolean;
  readonly orderId: string;
}) => {
  const t = useTranslations("admin.orders.boxy");
  return (
    <Panel description={t("sendHint")} title={t("title")}>
      {addressReady ? null : (
        <p className="text-destructive text-sm">{t("noArea")}</p>
      )}
      <ActionForm action={sendWithBoxy}>
        <input name="id" type="hidden" value={orderId} />
        <div className="grid gap-3">
          <SelectField
            defaultValue="M"
            label={t("size")}
            name="size"
            options={(["S", "M", "L"] as const).map((size) => ({
              label: t(`sizes.${size}`),
              value: size,
            }))}
          />
          <CheckboxField label={t("fragile")} name="fragile" />
          <SubmitButton>{t("send")}</SubmitButton>
        </div>
      </ActionForm>
    </Panel>
  );
};

/** The tracking code, linked to Boxy's tracking page when there is one. */
const TrackingCode = ({ shipment }: { readonly shipment: Shipment }) => {
  if (!shipment.tracking_code) {
    return null;
  }
  return shipment.tracking_url ? (
    <a
      className="font-mono hover:underline"
      dir="ltr"
      href={shipment.tracking_url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {shipment.tracking_code}
    </a>
  ) : (
    <span className="font-mono" dir="ltr">
      {shipment.tracking_code}
    </span>
  );
};

/** What the courier collects, Boxy's fee, the parcel and the pick-up. */
const ShipmentFacts = ({ shipment }: { readonly shipment: Shipment }) => {
  const t = useTranslations("admin.orders.boxy");
  const format = formatters(useLocale() as Locale);
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
      <dt>{t("collect")}</dt>
      <dd className="text-end text-foreground tabular-nums">
        {shipment.cash_amount > 0
          ? format.money(shipment.cash_amount)
          : t("prepaid")}
      </dd>
      {shipment.fee === null ? null : (
        <>
          <dt>{t("fee")}</dt>
          <dd className="text-end text-foreground tabular-nums">
            {format.money(shipment.fee)}
          </dd>
        </>
      )}
      <dt>{t("parcel")}</dt>
      <dd className="text-end text-foreground">
        {t(`sizes.${shipment.size as "L" | "M" | "S"}`)}
        {shipment.fragile ? ` · ${t("fragile")}` : ""}
      </dd>
      <dt>{t("pickup")}</dt>
      <dd className="text-end text-foreground">
        {shipment.pickup_id ? t("pickupRequested") : t("pickupMissing")}
      </dd>
    </dl>
  );
};

/** Boxy's latest steps for the parcel, oldest first. */
const ShipmentHistory = ({ shipment }: { readonly shipment: Shipment }) => {
  const format = formatters(useLocale() as Locale);
  const history = (shipment.history as unknown as HistoryStep[]).slice(-6);
  if (history.length === 0) {
    return null;
  }
  return (
    <ol className="grid gap-1 border-s ps-3">
      {history.map((step) => (
        <li key={`${step.status}-${step.at}`}>
          <span className="font-medium">{step.title}</span>
          {step.at ? (
            <span className="text-muted-foreground">
              {" · "}
              {format.dateTime(step.at)}
            </span>
          ) : null}
          {step.message ? (
            <span className="block text-muted-foreground text-xs">
              {step.message}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
};

/** Print the label, refresh from Boxy, and cancel before pick-up. */
const ShipmentActions = ({
  orderId,
  shipment,
}: {
  readonly orderId: string;
  readonly shipment: Shipment;
}) => {
  const t = useTranslations("admin.orders.boxy");
  const [labelUrl, setLabelUrl] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      {labelUrl ? (
        <a
          className="inline-flex h-8 items-center rounded-md border px-3 font-medium text-sm hover:bg-accent"
          href={labelUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("openLabel")}
        </a>
      ) : (
        <ActionForm
          action={getBoxyLabel}
          onSuccess={(state) =>
            setLabelUrl(
              takeLabel(state.data, `${shipment.tracking_code ?? "label"}.pdf`)
            )
          }
        >
          <input name="id" type="hidden" value={orderId} />
          <SubmitButton size="sm" variant="secondary">
            {t("label")}
          </SubmitButton>
        </ActionForm>
      )}
      <ActionButton
        action={refreshBoxyShipment}
        fields={{ id: orderId }}
        size="sm"
        variant="secondary"
      >
        {t("refresh")}
      </ActionButton>
      {CANCELLABLE.has(shipment.status) ? (
        <ActionButton
          action={cancelBoxyShipment}
          confirm={{ description: t("cancelHint"), title: t("cancelConfirm") }}
          fields={{ id: orderId }}
          size="sm"
          variant="ghost"
        >
          {t("cancel")}
        </ActionButton>
      ) : null}
    </div>
  );
};

interface BoxyPanelProps {
  /** The address names an area in a province Boxy serves. */
  readonly addressReady: boolean;
  /** The order can go out now (delivery, paid or confirmed, not sent). */
  readonly canSend: boolean;
  readonly canWrite: boolean;
  readonly orderId: string;
  /** The order's live parcel, if it has one. */
  readonly shipment: Shipment | null;
}

/**
 * Delivery with Boxy on an order: send the packed parcel (size, fragile),
 * then follow it: tracking, status and history, label, refresh, cancel.
 */
export const BoxyPanel = ({
  addressReady,
  canSend,
  canWrite,
  orderId,
  shipment,
}: BoxyPanelProps) => {
  const t = useTranslations("admin.orders.boxy");
  const format = formatters(useLocale() as Locale);

  if (!shipment) {
    return canSend && canWrite ? (
      <SendForm addressReady={addressReady} orderId={orderId} />
    ) : null;
  }

  return (
    <Panel title={t("title")}>
      <div className="grid gap-2 text-sm">
        <p className="flex flex-wrap items-center gap-2">
          <Badge variant={shipment.delivered_at ? "default" : "secondary"}>
            {shipment.status_title ?? shipment.status}
          </Badge>
          <TrackingCode shipment={shipment} />
        </p>
        {shipment.action_required ? (
          <p className="text-destructive">{shipment.action_required}</p>
        ) : null}
        {shipment.returned_at ? (
          <p className="text-destructive">{t("returned")}</p>
        ) : null}
        <ShipmentFacts shipment={shipment} />
        <ShipmentHistory shipment={shipment} />
        {shipment.synced_at ? (
          <p className="text-muted-foreground text-xs">
            {t("synced", { at: format.dateTime(shipment.synced_at) })}
          </p>
        ) : null}
      </div>
      {canWrite ? (
        <ShipmentActions orderId={orderId} shipment={shipment} />
      ) : null}
    </Panel>
  );
};
