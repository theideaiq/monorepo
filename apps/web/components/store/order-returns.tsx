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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ImagePlusIcon, Undo2Icon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import {
  MAX_RETURN_PHOTOS,
  needsPhotos,
  type OrderReturn,
  RETURN_REASONS,
  type ReturnReason,
  useCancelReturn,
  useRequestReturn,
} from "@/lib/return-queries";

/** Returns can be withdrawn until a courier collects the item. */
const WITHDRAWABLE = new Set(["requested", "disputed", "approved"]);

const PhotoPicker = ({
  onChange,
  photos,
}: {
  readonly onChange: (photos: File[]) => void;
  readonly photos: readonly File[];
}) => {
  const t = useTranslations("app.orders.returns");
  const inputId = useId();
  return (
    <ul className="flex flex-wrap gap-2">
      {photos.map((photo, index) => (
        <li className="flex items-center gap-1 text-sm" key={photo.name}>
          <span className="max-w-40 truncate">{photo.name}</span>
          <Button
            aria-label={t("removePhoto")}
            onClick={() => onChange(photos.filter((_, at) => at !== index))}
            size="icon"
            variant="ghost"
          >
            <XIcon className="size-3.5" />
          </Button>
        </li>
      ))}
      {photos.length < MAX_RETURN_PHOTOS ? (
        <li>
          <label
            className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-muted-foreground text-sm hover:bg-muted"
            htmlFor={inputId}
          >
            <ImagePlusIcon aria-hidden="true" className="size-4" />
            {t("addPhoto")}
          </label>
          <input
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            id={inputId}
            multiple
            onChange={(event) => {
              const added = Array.from(event.target.files ?? []);
              onChange([...photos, ...added].slice(0, MAX_RETURN_PHOTOS));
              event.target.value = "";
            }}
            type="file"
          />
        </li>
      ) : null}
    </ul>
  );
};

/** "Return": asks to return some of a delivered line. */
export const ReturnLine = ({
  available,
  lineId,
  name,
  orderId,
}: {
  readonly available: number;
  readonly lineId: string;
  readonly name: string;
  readonly orderId: string;
}) => {
  const t = useTranslations("app.orders.returns");
  const request = useRequestReturn();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [unopened, setUnopened] = useState(false);
  const ids = { details: useId(), quantity: useId(), reason: useId() };

  const ready =
    reason !== "" &&
    quantity >= 1 &&
    quantity <= available &&
    (!needsPhotos(reason) || photos.length > 0) &&
    (reason !== "changed_mind" || unopened);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Undo2Icon className="size-4" />
          {t("return")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { name })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!(ready && reason)) {
              return;
            }
            request.mutate(
              {
                details,
                line: lineId,
                orderId,
                photos,
                quantity,
                reason,
                unopened,
              },
              { onSuccess: () => setOpen(false) }
            );
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor={ids.reason}>{t("reason")}</Label>
            <Select
              onValueChange={(value) => setReason(value as ReturnReason)}
              value={reason}
            >
              <SelectTrigger id={ids.reason}>
                <SelectValue placeholder={t("chooseReason")} />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`reasons.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {available > 1 ? (
            <div className="grid gap-2">
              <Label htmlFor={ids.quantity}>{t("quantity")}</Label>
              <Input
                id={ids.quantity}
                max={available}
                min={1}
                onChange={(event) => setQuantity(Number(event.target.value))}
                type="number"
                value={quantity}
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor={ids.details}>{t("details")}</Label>
            <Textarea
              id={ids.details}
              maxLength={2000}
              onChange={(event) => setDetails(event.target.value)}
              value={details}
            />
          </div>
          {reason && needsPhotos(reason) ? (
            <div className="grid gap-2">
              <p className="font-medium text-sm">{t("photos")}</p>
              <PhotoPicker onChange={setPhotos} photos={photos} />
            </div>
          ) : null}
          {reason === "changed_mind" ? (
            <div className="flex items-start gap-2">
              <Checkbox
                checked={unopened}
                id={`${ids.reason}-unopened`}
                onCheckedChange={(value) => setUnopened(value === true)}
              />
              <Label
                className="font-normal leading-snug"
                htmlFor={`${ids.reason}-unopened`}
              >
                {t("unopened")}
              </Label>
            </div>
          ) : null}
          <p className="text-muted-foreground text-xs">
            {t.rich("policy", {
              link: (chunks) => (
                <Link className="underline" href="/legal/returns">
                  {chunks}
                </Link>
              ),
            })}
          </p>
          {request.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {t("failed")}
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={!ready || request.isPending} type="submit">
              {request.isPending ? t("sending") : t("send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/** The order's returns and where each one is. */
export const OrderReturns = ({
  names,
  orderId,
  returns,
}: {
  readonly names: ReadonlyMap<string, string>;
  readonly orderId: string;
  readonly returns: readonly OrderReturn[];
}) => {
  const t = useTranslations("app.orders.returns");
  const locale = useLocale() as Locale;
  const cancel = useCancelReturn(orderId);

  if (returns.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("listTitle")}</CardTitle>
        <CardDescription>{t("listDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {returns.map((item) => (
            <li className="grid gap-1 py-3 text-sm" key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {t("number", { number: String(item.number) })}
                </span>
                <span>
                  {names.get(item.order_item_id) ?? ""} ×
                  {formatNumber(item.quantity, locale)}
                </span>
                <Badge className="ms-auto" variant="secondary">
                  {t(`status.${item.status}`)}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {t(`reasons.${item.reason}`)} ·{" "}
                {formatDate(item.created_at, locale)}
              </p>
              <p>{t(`next.${item.status}`)}</p>
              {item.refund_amount === null ? null : (
                <p>
                  {t("refund", {
                    amount: formatPrice(item.refund_amount, locale),
                    bulbs: formatNumber(item.refund_bulbs ?? 0, locale),
                  })}
                </p>
              )}
              {item.staff_note ? (
                <p className="text-muted-foreground">{item.staff_note}</p>
              ) : null}
              {WITHDRAWABLE.has(item.status) ? (
                <Button
                  className="justify-self-start"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate(item.id)}
                  size="sm"
                  variant="ghost"
                >
                  {t("withdraw")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {cancel.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("withdrawFailed")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};
