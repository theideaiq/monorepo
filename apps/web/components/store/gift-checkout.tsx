"use client";

import { formatPrice, localized } from "@repo/commerce";
import type { DeliveryZone } from "@repo/commerce/catalog";
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { GiftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import { Field } from "@/components/address-fields";

/** The longest message a gift carries (as `gifts.message`). */
export const GIFT_MESSAGE_MAX = 500;

/** What the buyer chooses for a gift. */
export interface GiftForm {
  hidePrice: boolean;
  message: string;
  zoneId: string;
}

export const emptyGift: GiftForm = { hidePrice: true, message: "", zoneId: "" };

interface GiftSwitchProps {
  readonly busy: boolean;
  readonly gift: boolean;
  readonly onChange: (gift: boolean) => void;
  /** The cart holds a rental, which can't be a gift. */
  readonly rentals?: boolean;
}

/** "Send as a gift": the recipient gives their own address from a link. */
export const GiftSwitch = ({
  busy,
  gift,
  onChange,
  rentals = false,
}: GiftSwitchProps) => {
  const t = useTranslations("app.checkout.gift");
  const id = useId();
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <Checkbox
          checked={gift && !rentals}
          disabled={busy || rentals}
          id={id}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <div className="grid gap-1">
          <Label className="flex items-center gap-2" htmlFor={id}>
            <GiftIcon className="size-4" />
            {t("switch")}
          </Label>
          <p className="text-muted-foreground text-sm">
            {t(rentals ? "noRentals" : "switchHint")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

interface GiftDetailsCardProps {
  readonly busy: boolean;
  readonly form: GiftForm;
  readonly missingZone: boolean;
  readonly onChange: (form: GiftForm) => void;
  readonly zones: DeliveryZone[];
}

/** Where the gift goes, the message and whether the price shows. */
export const GiftDetailsCard = ({
  busy,
  form,
  missingZone,
  onChange,
  zones,
}: GiftDetailsCardProps) => {
  const t = useTranslations("app.checkout.gift");
  const tCheckout = useTranslations("app.checkout");
  const locale = useLocale() as Locale;
  const id = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field
          error={missingZone ? t("zoneMissing") : null}
          hint={t("zoneHint")}
          htmlFor={`${id}-zone`}
          label={t("zone")}
        >
          <Select
            disabled={busy}
            onValueChange={(zoneId) => onChange({ ...form, zoneId })}
            value={form.zoneId}
          >
            <SelectTrigger
              aria-describedby={missingZone ? `${id}-zone-error` : undefined}
              aria-invalid={missingZone}
              className="w-full"
              id={`${id}-zone`}
            >
              <SelectValue placeholder={t("zonePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {tCheckout("address.zoneOption", {
                    fee: formatPrice(zone.fee, locale),
                    name: localized(zone, "name", locale),
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field htmlFor={`${id}-message`} label={t("message")} optional>
          <Textarea
            disabled={busy}
            id={`${id}-message`}
            maxLength={GIFT_MESSAGE_MAX}
            onChange={(event) =>
              onChange({ ...form, message: event.target.value })
            }
            placeholder={t("messagePlaceholder")}
            rows={3}
            value={form.message}
          />
        </Field>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={form.hidePrice}
            disabled={busy}
            id={`${id}-hide`}
            onCheckedChange={(checked) =>
              onChange({ ...form, hidePrice: checked === true })
            }
          />
          <Label htmlFor={`${id}-hide`}>{t("hidePrice")}</Label>
        </div>
        <p className="text-muted-foreground text-xs">{t("payNote")}</p>
      </CardContent>
    </Card>
  );
};
