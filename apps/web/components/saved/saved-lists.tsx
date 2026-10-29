"use client";

import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Switch } from "@repo/design-system/components/ui/switch";
import { type Locale, localePath } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { CopyIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import {
  type SavedList,
  useCreateList,
  useDeleteList,
  useSavedLists,
  useShareList,
} from "@/lib/list-queries";
import type { WishlistItem } from "@/lib/wishlist-queries";

/** Where a shared list opens, for friends. */
export const sharedListPath = (token: string) => `/lists/${token}`;

const ListCard = ({
  items,
  list,
}: {
  readonly items: readonly WishlistItem[];
  readonly list: SavedList;
}) => {
  const t = useTranslations("app.wishlist.lists");
  const locale = useLocale() as Locale;
  const id = useId();
  const share = useShareList();
  const remove = useDeleteList();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = `${window.location.origin}${localePath(locale, sharedListPath(list.share_token))}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <li className="grid gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          {list.name}
          <span className="text-muted-foreground text-sm">
            {" "}
            · {t("count", { count: formatNumber(items.length, locale) })}
          </span>
        </p>
        <Button
          disabled={remove.isPending}
          onClick={() => remove.mutate(list.id)}
          size="sm"
          variant="ghost"
        >
          {t("delete")}
        </Button>
      </div>
      {items.length > 0 ? (
        <ul className="grid gap-1 text-sm">
          {items.map((item) =>
            item.product ? (
              <li key={item.product_id}>
                {localized(item.product, "name", locale)}
              </li>
            ) : null
          )}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{t("emptyList")}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Switch
          checked={list.shared}
          disabled={share.isPending}
          id={`${id}-shared`}
          onCheckedChange={(on) => share.mutate({ id: list.id, shared: on })}
        />
        <Label htmlFor={`${id}-shared`}>{t("shared")}</Label>
        {list.shared ? (
          <Button onClick={copy} size="sm" variant="outline">
            <CopyIcon />
            {copied ? t("copied") : t("copyLink")}
          </Button>
        ) : null}
      </div>
    </li>
  );
};

/** Pass → Saved → Lists: named lists, each private or shared by link. */
export const SavedLists = ({
  items,
}: {
  readonly items: readonly WishlistItem[];
}) => {
  const t = useTranslations("app.wishlist.lists");
  const lists = useSavedLists();
  const create = useCreateList();
  const id = useId();
  const [name, setName] = useState("");

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) {
            create.mutate(name, { onSuccess: () => setName("") });
          }
        }}
      >
        <div className="grid gap-1">
          <Label htmlFor={`${id}-name`}>{t("name")}</Label>
          <Input
            id={`${id}-name`}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
            value={name}
          />
        </div>
        <Button disabled={!name.trim() || create.isPending} type="submit">
          {t("create")}
        </Button>
      </form>
      {lists.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : null}
      <ul className="grid gap-3">
        {(lists.data ?? []).map((list) => (
          <ListCard
            items={items.filter((item) => item.list_id === list.id)}
            key={list.id}
            list={list}
          />
        ))}
      </ul>
    </div>
  );
};
