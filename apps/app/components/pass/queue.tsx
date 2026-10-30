"use client";

import { localized, planName } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { cn } from "@repo/design-system/lib/utils";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  ListOrderedIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type DragEvent, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { productHref } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import {
  type FamilyProfile,
  familyErrorKey,
  useFamilyActions,
  useFamilyProfiles,
} from "@/lib/family";
import { soloPlans } from "@/lib/plus";
import { usePlusAvailability } from "@/lib/plus-availability";
import {
  meetsTier,
  planForTier,
  useRentalAllowance,
  useRentalTiers,
} from "@/lib/plus-queries";
import { usePlans } from "@/lib/queries";
import {
  type QueueItem,
  useHasPlus,
  useQueue,
  useRemoveFromQueue,
  useReorderQueue,
} from "@/lib/queue-queries";
import { AvailabilityLabel } from "./plus-words";

/** The queue's product ids with one moved to another place. */
export const moveInQueue = (
  ids: readonly string[],
  productId: string,
  to: number
) => {
  const from = ids.indexOf(productId);
  if (from < 0 || to < 0 || to >= ids.length || from === to) {
    return [...ids];
  }
  const next = ids.filter((id) => id !== productId);
  next.splice(to, 0, productId);
  return next;
};

/** Who a queued item is for: a kid's profile, a teen, or the member. */
const ForWhom = ({
  item,
  profiles,
}: {
  readonly item: QueueItem;
  readonly profiles: readonly FamilyProfile[];
}) => {
  const t = useTranslations("app.pass.queue");
  const kid = profiles.find((profile) => profile.id === item.for_profile);
  if (kid) {
    return <Badge variant="secondary">{t("for", { name: kid.name })}</Badge>;
  }
  return item.for_user ? (
    <Badge variant="secondary">{t("forTeen")}</Badge>
  ) : null;
};

const QueueRow = ({
  dragging,
  index,
  item,
  onDragEnd,
  onDragStart,
  onDrop,
  onMove,
  profiles,
  skipped,
  total,
}: {
  readonly dragging: boolean;
  readonly index: number;
  readonly item: QueueItem;
  readonly onDragEnd: () => void;
  readonly onDragStart: () => void;
  readonly onDrop: () => void;
  readonly onMove: (to: number) => void;
  readonly profiles: readonly FamilyProfile[];
  /** Why swaps pass over it ("Needs Blaze"), or null. */
  readonly skipped: string | null;
  readonly total: number;
}) => {
  const t = useTranslations("app.pass.queue");
  const locale = useLocale();
  const tFamily = useTranslations("app.pass.family.errors");
  const remove = useRemoveFromQueue();
  const { queueFor } = useFamilyActions();
  const availability = usePlusAvailability([item.product_id]).get(
    item.product_id
  );
  const name = item.product ? localized(item.product, "name", locale) : "";
  const slug = item.product?.slug ?? "";

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: dragging is a pointer extra; Move up and Move down are the keyboard way.
    <li
      className={cn(
        "flex items-center gap-3 p-3 text-sm",
        dragging && "opacity-50"
      )}
      draggable
      onDragEnd={onDragEnd}
      onDragOver={(event: DragEvent) => event.preventDefault()}
      onDragStart={(event: DragEvent) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDrop={(event: DragEvent) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <GripVerticalIcon
        aria-hidden="true"
        className="hidden size-4 shrink-0 cursor-grab text-muted-foreground sm:block"
      />
      <span className="w-6 shrink-0 text-center font-mono text-muted-foreground">
        {formatNumber(index + 1, locale)}
      </span>
      <Link className="w-12 shrink-0" href={productHref(slug)}>
        <ProductImage alt={name} path={item.product?.images[0]} sizes="48px" />
      </Link>
      <div className="grid min-w-0 flex-1 gap-1">
        <Link
          className="truncate font-medium hover:underline"
          href={productHref(slug)}
        >
          {name}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <AvailabilityLabel availability={availability} />
          <ForWhom item={item} profiles={profiles} />
        </div>
        {skipped ? (
          <p className="text-muted-foreground text-xs">{skipped}</p>
        ) : null}
        {queueFor.isError ? (
          <p className="text-destructive text-xs" role="alert">
            {tFamily(familyErrorKey(queueFor.error))}
          </p>
        ) : null}
      </div>
      <Button
        aria-label={t("up", { name })}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        size="icon"
        variant="ghost"
      >
        <ArrowUpIcon />
      </Button>
      <Button
        aria-label={t("down", { name })}
        disabled={index === total - 1}
        onClick={() => onMove(index + 1)}
        size="icon"
        variant="ghost"
      >
        <ArrowDownIcon />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label={t("more", { name })} size="icon" variant="ghost">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(0)}>
            {t("toTop")}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={productHref(slug)}>{t("buyInstead")}</Link>
          </DropdownMenuItem>
          {profiles.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("queueFor")}</DropdownMenuLabel>
              {profiles.map((profile) => (
                <DropdownMenuItem
                  disabled={item.for_profile === profile.id}
                  key={profile.id}
                  onSelect={() =>
                    queueFor.mutate({
                      product: item.product_id,
                      profile: profile.id,
                    })
                  }
                >
                  {profile.name}
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() => remove.mutate(item.product_id)}
          >
            {t("remove")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
};

/** What to rent next, in order: drag, or Move up and Move down. */
export const QueueList = () => {
  const t = useTranslations("app.pass.queue");
  const locale = useLocale();
  const queue = useQueue();
  const reorder = useReorderQueue();
  const profiles = useFamilyProfiles().data ?? [];
  const allowance = useRentalAllowance().data;
  const plans = soloPlans(usePlans("plus").data ?? []);
  const { items } = queue;
  const tiers = useRentalTiers(items.map((item) => item.product_id)).data;
  const [dragged, setDragged] = useState<string | null>(null);
  const ids = items.map((item) => item.product_id);

  const move = (productId: string, to: number) => {
    const next = moveInQueue(ids, productId, to);
    if (next.join() !== ids.join()) {
      reorder.mutate(next);
    }
  };

  /** Why swaps pass over an item: the plan it needs. */
  const skipped = (productId: string) => {
    const required = tiers?.get(productId);
    if (!allowance || meetsTier(required, allowance.tier)) {
      return null;
    }
    const plan = planForTier(plans, required ?? 0);
    return plan
      ? t("needsPlan", { plan: planName(plan, locale) })
      : t("needsHigher");
  };

  if (queue.isPending) {
    return <SectionSpinner />;
  }
  if (queue.isError) {
    return <ErrorState onRetry={() => queue.refetch()} />;
  }
  if (items.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListOrderedIcon />
          </EmptyMedia>
          <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("empty")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/plus">{t("browse")}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  return (
    <div className="grid gap-2">
      <ol className="divide-y rounded-lg border bg-card">
        {items.map((item, index) => (
          <QueueRow
            dragging={dragged === item.product_id}
            index={index}
            item={item}
            key={item.product_id}
            onDragEnd={() => setDragged(null)}
            onDragStart={() => setDragged(item.product_id)}
            onDrop={() => {
              if (dragged) {
                move(dragged, index);
              }
              setDragged(null);
            }}
            onMove={(to) => move(item.product_id, to)}
            profiles={profiles}
            skipped={skipped(item.product_id)}
            total={items.length}
          />
        ))}
      </ol>
      {reorder.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("moveFailed")}
        </p>
      ) : null}
    </div>
  );
};

/** `/pass/queue`: the Plus queue; swaps take from the top. */
export const QueuePage = () => {
  const t = useTranslations("app.pass.queue");
  const hasPlus = useHasPlus();
  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-6">
        <p className="text-muted-foreground">{t("description")}</p>
        {hasPlus ? null : (
          <p className="rounded-md bg-muted p-4 text-sm">
            {t("notMember")}{" "}
            <Link
              className="font-medium text-pink-text underline"
              href="/plus/plans"
            >
              {t("join")}
            </Link>
          </p>
        )}
        <QueueList />
      </div>
    </>
  );
};
