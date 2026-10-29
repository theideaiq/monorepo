"use client";

import { liveVariants, localized } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@repo/design-system/components/ui/toggle-group";
import { Link } from "@repo/internationalization/navigation";
import { HeartIcon, ShoppingCartIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Queue } from "@/components/plus/plus-tools";
import { SavedLists } from "@/components/saved/saved-lists";
import { TellMe } from "@/components/saved/tell-me";
import { ErrorState, SectionSpinner } from "@/components/states";
import { MyOffers } from "@/components/store/my-offers";
import { Price } from "@/components/store/price";
import { productHref } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { QueueButton } from "@/components/store/queue-button";
import { type SavedList, useSavedLists } from "@/lib/list-queries";
import { useHasPlus } from "@/lib/queue-queries";
import {
  type SavedFilter,
  type SavedSort,
  savedState,
  viewSaved,
} from "@/lib/saved-state";
import {
  useMoveToCart,
  useToggleWishlist,
  useUpdateSaved,
  useWishlist,
  type WishlistItem,
} from "@/lib/wishlist-queries";

type Product = NonNullable<WishlistItem["product"]>;

/** What the main button of a saved line does. */
export const wishlistAction = (
  product: Product
): "choose" | "move" | "rent" | "unavailable" => {
  if (product.status !== "active") {
    return "unavailable";
  }
  if (product.kind === "rental") {
    return "rent";
  }
  if (liveVariants(product.variants).length > 1) {
    return "choose";
  }
  return product.stock_count > 0 ? "move" : "unavailable";
};

const NO_LIST = "none";

/** Moves a saved item into one of the member's lists, or out of them. */
const MoveToList = ({
  item,
  lists,
}: {
  readonly item: WishlistItem;
  readonly lists: readonly SavedList[];
}) => {
  const t = useTranslations("app.wishlist.lists");
  const update = useUpdateSaved();
  if (lists.length === 0) {
    return null;
  }
  return (
    <Select
      disabled={update.isPending}
      onValueChange={(value) =>
        update.mutate({
          changes: { list_id: value === NO_LIST ? null : value },
          productId: item.product_id,
        })
      }
      value={item.list_id ?? NO_LIST}
    >
      <SelectTrigger aria-label={t("moveTo")} className="h-8 w-40" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_LIST}>{t("noList")}</SelectItem>
        {lists.map((list) => (
          <SelectItem key={list.id} value={list.id}>
            {list.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const MainAction = ({
  name,
  product,
}: {
  readonly name: string;
  readonly product: Product;
}) => {
  const t = useTranslations("app.wishlist");
  const move = useMoveToCart();
  const action = wishlistAction(product);
  return (
    <>
      {action === "move" ? (
        <Button
          disabled={move.isPending}
          onClick={() => move.mutate({ name, product })}
          size="sm"
        >
          <ShoppingCartIcon />
          {move.isPending ? t("moving") : t("moveToCart")}
        </Button>
      ) : null}
      {action === "choose" ? (
        <Button asChild size="sm">
          <Link href={productHref(product.slug)}>{t("chooseOptions")}</Link>
        </Button>
      ) : null}
      {action === "rent" ? (
        <Button asChild size="sm">
          <Link href="/plus">{t("rentWithPlus")}</Link>
        </Button>
      ) : null}
      {move.isError ? (
        <p className="w-full text-destructive text-xs" role="alert">
          {t("moveFailed")}
        </p>
      ) : null}
    </>
  );
};

const SavedLine = ({
  item,
  lists,
}: {
  readonly item: WishlistItem;
  readonly lists: readonly SavedList[];
}) => {
  const t = useTranslations("app.wishlist");
  const locale = useLocale();
  const remove = useToggleWishlist();
  const product = item.product as Product;
  const name = localized(product, "name", locale);
  const state = savedState(item);

  return (
    <li className="flex gap-4 py-4">
      <Link className="w-20 shrink-0 sm:w-24" href={productHref(product.slug)}>
        <ProductImage alt={name} path={product.images[0]} sizes="96px" />
      </Link>
      <div className="grid min-w-0 flex-1 content-start gap-1.5">
        <Link
          className="line-clamp-2 font-medium text-sm hover:underline"
          href={productHref(product.slug)}
        >
          {name}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={state === "unavailable" ? "outline" : "secondary"}>
            {t(`state.${state}`)}
          </Badge>
          {product.kind === "sale" ? (
            <Price
              className="text-sm"
              compareAtPrice={product.compare_at_price}
              price={product.price}
            />
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <MainAction name={name} product={product} />
          <QueueButton productId={product.id} rentable={product.rentable} />
          <TellMe item={item} />
          <MoveToList item={item} lists={lists} />
          <Button
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate({ productId: product.id, saved: true })
            }
            size="sm"
            variant="ghost"
          >
            {t("remove")}
          </Button>
        </div>
      </div>
    </li>
  );
};

const FILTERS: SavedFilter[] = ["all", "onSale", "inStock", "comingSoon"];

/** The Saved tab: everything hearted, with filters, a sort and actions. */
const SavedItems = ({
  items,
  lists,
}: {
  readonly items: readonly WishlistItem[];
  readonly lists: readonly SavedList[];
}) => {
  const t = useTranslations("app.wishlist");
  const [filter, setFilter] = useState<SavedFilter>("all");
  const [sort, setSort] = useState<SavedSort>("recent");
  const shown = viewSaved(items, filter, sort);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          aria-label={t("filterLabel")}
          onValueChange={(value) => value && setFilter(value as SavedFilter)}
          type="single"
          value={filter}
          variant="outline"
        >
          {FILTERS.map((value) => (
            <ToggleGroupItem key={value} size="sm" value={value}>
              {t(`filter.${value}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Select
          onValueChange={(value) => setSort(value as SavedSort)}
          value={sort}
        >
          <SelectTrigger aria-label={t("sortLabel")} className="w-44" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t("sort.recent")}</SelectItem>
            <SelectItem value="price">{t("sort.price")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {shown.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noneMatch")}</p>
      ) : (
        <ul className="divide-y">
          {shown.map((item) => (
            <SavedLine item={item} key={item.product_id} lists={lists} />
          ))}
        </ul>
      )}
    </div>
  );
};

const EmptySaved = () => {
  const t = useTranslations("app.wishlist.empty");
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HeartIcon />
        </EmptyMedia>
        <EmptyTitle>{t("title")}</EmptyTitle>
        <EmptyDescription>{t("description")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/store">{t("browse")}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
};

/**
 * Your Pass → Saved: what the member watches, in three tabs. Saved holds
 * everything hearted (with its state, "Tell me" and actions), Lists the
 * named lists, and Queue (Plus members) what to rent next.
 */
export const Wishlist = () => {
  const t = useTranslations("app.wishlist");
  const wishlist = useWishlist();
  const lists = useSavedLists().data ?? [];
  const hasPlus = useHasPlus();
  const items = (wishlist.data ?? []).filter((item) => item.product);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-6">
        <p className="text-muted-foreground">{t("description")}</p>
        <Tabs defaultValue="saved">
          <TabsList>
            <TabsTrigger value="saved">{t("tabs.saved")}</TabsTrigger>
            <TabsTrigger value="lists">{t("tabs.lists")}</TabsTrigger>
            {hasPlus ? (
              <TabsTrigger value="queue">{t("tabs.queue")}</TabsTrigger>
            ) : null}
          </TabsList>
          <TabsContent className="grid gap-6 pt-4" value="saved">
            {wishlist.isPending ? <SectionSpinner /> : null}
            {wishlist.isError ? (
              <ErrorState onRetry={() => wishlist.refetch()} />
            ) : null}
            {wishlist.data && items.length === 0 ? <EmptySaved /> : null}
            {items.length > 0 ? (
              <SavedItems items={items} lists={lists} />
            ) : null}
            <MyOffers />
          </TabsContent>
          <TabsContent className="pt-4" value="lists">
            <SavedLists items={items} />
          </TabsContent>
          {hasPlus ? (
            <TabsContent className="pt-4" value="queue">
              <Queue />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </>
  );
};
