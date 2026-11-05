"use client";

import { useAuth } from "@repo/auth/provider";
import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, PlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useDeferredValue, useId, useState } from "react";
import { ShareControls } from "@/components/saved/saved-lists";
import { SectionSpinner } from "@/components/states";
import { ProductImage } from "@/components/store/product-image";
import {
  type SavedList,
  useCreateListReturning,
  useSavedLists,
} from "@/lib/list-queries";
import { queryKeys, requireUserId, unwrap } from "@/lib/queries";
import { useProducts } from "@/lib/store-queries";
import { useWishlist } from "@/lib/wishlist-queries";

const RESULTS = 12;

/**
 * Puts a record in the mixtape: saves it into this list. A record already
 * saved moves here (one list per saved item).
 */
const useAddToMixtape = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listId,
      productId,
    }: {
      listId: string;
      productId: string;
    }) => {
      const userId = requireUserId(user?.id);
      // Members may insert only the product (column grants); the list is an
      // update, which also moves a record saved in another list.
      unwrap(
        await supabase
          .from("wishlist_items")
          .upsert(
            { product_id: productId, user_id: userId },
            { ignoreDuplicates: true, onConflict: "user_id,product_id" }
          )
      );
      unwrap(
        await supabase
          .from("wishlist_items")
          .update({ list_id: listId })
          .eq("user_id", userId)
          .eq("product_id", productId)
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist(user?.id ?? ""),
      }),
  });
};

const NameStep = ({
  onCreated,
}: {
  readonly onCreated: (list: SavedList) => void;
}) => {
  const t = useTranslations("app.mixtape");
  const create = useCreateListReturning();
  const id = useId();
  const [name, setName] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) {
          create.mutate(name, {
            onSuccess: (list) => {
              if (list) {
                onCreated(list as SavedList);
              }
            },
          });
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
        {t("start")}
      </Button>
      {create.isError ? (
        <p className="w-full text-destructive text-sm" role="alert">
          {t("error")}
        </p>
      ) : null}
    </form>
  );
};

const Builder = ({ created }: { readonly created: SavedList }) => {
  const t = useTranslations("app.mixtape");
  // The live row (shared or not), once the lists query has it.
  const list =
    useSavedLists().data?.find((row) => row.id === created.id) ?? created;
  const locale = useLocale() as Locale;
  const id = useId();
  const [search, setSearch] = useState("");
  const term = useDeferredValue(search.trim());
  const results = useProducts({
    category: "music",
    limit: RESULTS,
    search: term,
  });
  const wishlist = useWishlist();
  const add = useAddToMixtape();
  const tracks = (wishlist.data ?? []).filter(
    (item) => item.list_id === list.id && item.product
  );
  const inMixtape = new Set(tracks.map((item) => item.product_id));
  const savedElsewhere = new Set(
    (wishlist.data ?? [])
      .filter((item) => item.list_id !== list.id)
      .map((item) => item.product_id)
  );

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-lg border p-4">
        <h2 className="font-medium">
          {list.name}
          <span className="text-muted-foreground text-sm">
            {" "}
            ·{" "}
            {t("count", {
              count: formatNumber(tracks.length, locale),
              n: tracks.length,
            })}
          </span>
        </h2>
        {tracks.length > 0 ? (
          <ol className="grid list-decimal gap-1 ps-5 text-sm">
            {tracks.map((item) =>
              item.product ? (
                <li key={item.product_id}>
                  {localized(item.product, "name", locale)}
                </li>
              ) : null
            )}
          </ol>
        ) : (
          <p className="text-muted-foreground text-sm">{t("emptyTape")}</p>
        )}
        <ShareControls list={list} />
      </section>

      <section className="grid gap-3">
        <div className="grid gap-1">
          <Label htmlFor={`${id}-search`}>{t("search")}</Label>
          <Input
            id={`${id}-search`}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            type="search"
            value={search}
          />
          <p className="text-muted-foreground text-xs">{t("moveHint")}</p>
        </div>
        {add.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("addError")}
          </p>
        ) : null}
        {results.isPending ? <SectionSpinner /> : null}
        {results.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noResults")}</p>
        ) : null}
        <ul className="grid gap-2 sm:grid-cols-2">
          {(results.data ?? []).map((product) => {
            const name = localized(product, "name", locale);
            const added = inMixtape.has(product.id);
            const moving = savedElsewhere.has(product.id);
            const action = moving ? t("move") : t("add");
            const label = added ? t("added") : action;
            return (
              <li
                className="flex items-center gap-3 rounded-lg border p-2"
                key={product.id}
              >
                <ProductImage
                  alt={name}
                  className="size-14 shrink-0"
                  path={product.images[0]}
                  sizes="56px"
                />
                <p className="min-w-0 flex-1 truncate text-sm">{name}</p>
                <Button
                  aria-label={`${label}: ${name}`}
                  disabled={added || add.isPending}
                  onClick={() =>
                    add.mutate({ listId: list.id, productId: product.id })
                  }
                  size="sm"
                  variant={added ? "ghost" : "outline"}
                >
                  {added ? <CheckIcon /> : <PlusIcon />}
                  {label}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};

/**
 * Pass → Lists → Make a mixtape (A7): name it, pick records from the Music
 * shelf, share the link. A mixtape is a saved list like any other.
 */
export const Mixtape = () => {
  const t = useTranslations("app.mixtape");
  const [list, setList] = useState<SavedList | null>(null);

  return (
    <div className="grid max-w-3xl gap-6">
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      {list ? <Builder created={list} /> : <NameStep onCreated={setList} />}
      <Link className="text-sm underline" href="/pass/lists">
        {t("allLists")}
      </Link>
    </div>
  );
};
