"use client";

import { localized } from "@repo/commerce";
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
import { formatNumber } from "@repo/internationalization/format";
import { PlusIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useDeferredValue, useId, useState } from "react";
import { RENT_TOGETHER_MAX, rentsTogether } from "@/lib/rent";
import { useCategories, useProducts } from "@/lib/store-queries";

/** An item added to the rental, with the name shown for it. */
export interface ExtraRental {
  name: string;
  productId: string;
}

/**
 * Rent up to 3 films, books or games for one delivery fee: the items added
 * to this rental, and a search for more (rentable, in those categories).
 */
export const RentTogether = ({
  busy,
  chosen,
  exclude,
  onAdd,
  onRemove,
}: {
  readonly busy: boolean;
  readonly chosen: readonly ExtraRental[];
  /** Items already in the rental (the main one included). */
  readonly exclude: readonly string[];
  readonly onAdd: (item: ExtraRental) => void;
  readonly onRemove: (productId: string) => void;
}) => {
  const t = useTranslations("app.rent.together");
  const locale = useLocale();
  const id = useId();
  const [term, setTerm] = useState("");
  const search = useDeferredValue(term.trim());
  const categories = useCategories("rental");
  const products = useProducts({ kind: "rental", limit: 24, search });
  const room = RENT_TOGETHER_MAX - 1 - chosen.length;
  const results = (products.data ?? [])
    .filter(
      (product) =>
        !exclude.includes(product.id) &&
        rentsTogether(product.category_id, categories.data ?? [])
    )
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { n: formatNumber(RENT_TOGETHER_MAX, locale) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {chosen.length > 0 ? (
          <ul className="grid gap-2">
            {chosen.map((item) => (
              <li
                className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
                key={item.productId}
              >
                <span className="min-w-0 truncate">{item.name}</span>
                <Button
                  aria-label={t("remove", { name: item.name })}
                  disabled={busy}
                  onClick={() => onRemove(item.productId)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <XIcon className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {room > 0 ? (
          <div className="grid gap-2">
            <Label htmlFor={`${id}-search`}>{t("search")}</Label>
            <Input
              disabled={busy}
              id={`${id}-search`}
              onChange={(event) => setTerm(event.target.value)}
              type="search"
              value={term}
            />
            {results.length > 0 ? (
              <ul className="grid gap-1">
                {results.map((product) => {
                  const name = localized(product, "name", locale);
                  return (
                    <li
                      className="flex items-center justify-between gap-3 text-sm"
                      key={product.id}
                    >
                      <span className="min-w-0 truncate">{name}</span>
                      <Button
                        disabled={busy}
                        onClick={() => onAdd({ name, productId: product.id })}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <PlusIcon className="size-4" />
                        {t("add")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">
                {products.isPending ? t("searching") : t("none")}
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">{t("full")}</p>
        )}
      </CardContent>
    </Card>
  );
};
