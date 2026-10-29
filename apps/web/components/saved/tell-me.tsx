"use client";

import { formatPrice } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { Switch } from "@repo/design-system/components/ui/switch";
import { BellIcon, BellOffIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useUpdateSaved, type WishlistItem } from "@/lib/wishlist-queries";

/**
 * "Tell me" on a saved item: watched changes (back in stock, out now, a
 * lower price) go to the bell, optionally only under a price target.
 */
export const TellMe = ({
  item,
}: {
  readonly item: Pick<WishlistItem, "notify" | "price_target" | "product_id">;
}) => {
  const t = useTranslations("app.wishlist.tellMe");
  const locale = useLocale();
  const id = useId();
  const update = useUpdateSaved();
  const [target, setTarget] = useState(
    item.price_target ? String(item.price_target) : ""
  );
  const amount = Number(target.replaceAll(",", ""));
  const validTarget = target === "" || (Number.isInteger(amount) && amount > 0);

  const save = (changes: Parameters<typeof update.mutate>[0]["changes"]) =>
    update.mutate({ changes, productId: item.product_id });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          {item.notify ? <BellIcon /> : <BellOffIcon />}
          {item.notify && item.price_target
            ? t("under", { price: formatPrice(item.price_target, locale) })
            : t(item.notify ? "on" : "off")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="grid w-72 gap-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${id}-notify`}>{t("label")}</Label>
          <Switch
            checked={item.notify}
            disabled={update.isPending}
            id={`${id}-notify`}
            onCheckedChange={(on) => save({ notify: on })}
          />
        </div>
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (validTarget) {
              save({
                notify: true,
                price_target: target === "" ? null : amount,
              });
            }
          }}
        >
          <Label htmlFor={`${id}-target`}>{t("target")}</Label>
          <div className="flex gap-2">
            <Input
              dir="ltr"
              id={`${id}-target`}
              inputMode="numeric"
              onChange={(event) => setTarget(event.target.value)}
              placeholder={t("targetPlaceholder")}
              value={target}
            />
            <Button
              disabled={!validTarget || update.isPending}
              size="sm"
              type="submit"
              variant="outline"
            >
              {t("saveTarget")}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};
