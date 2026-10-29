"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { ListPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useAddToQueue,
  useHasPlus,
  useIsQueued,
  useRemoveFromQueue,
} from "@/lib/queue-queries";

/**
 * "Add to queue" for Plus members on rentable products (separate from the
 * heart); nothing for anyone else.
 */
export const QueueButton = ({
  productId,
  rentable,
}: {
  readonly productId: string;
  readonly rentable: boolean;
}) => {
  const t = useTranslations("app.wishlist.queue");
  const hasPlus = useHasPlus();
  const queued = useIsQueued(productId);
  const add = useAddToQueue();
  const remove = useRemoveFromQueue();
  if (!(hasPlus && rentable)) {
    return null;
  }
  const busy = add.isPending || remove.isPending;
  return (
    <Button
      aria-pressed={queued}
      disabled={busy}
      onClick={() =>
        queued ? remove.mutate(productId) : add.mutate(productId)
      }
      size="sm"
      variant="outline"
    >
      <ListPlusIcon />
      {queued ? t("queued") : t("add")}
    </Button>
  );
};
