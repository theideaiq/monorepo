"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { HeartIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIsWishlisted, useToggleWishlist } from "@/lib/wishlist-queries";

/** Saves a product to the wishlist, or removes it (signed-in users only). */
export const WishlistButton = ({
  className,
  productId,
  withLabel = false,
}: {
  readonly className?: string;
  readonly productId: string;
  readonly withLabel?: boolean;
}) => {
  const t = useTranslations("app.wishlist");
  const { user } = useAuth();
  const saved = useIsWishlisted(productId);
  const toggle = useToggleWishlist();

  if (!user) {
    return null;
  }

  const label = saved ? t("remove") : t("add");
  const text = saved ? t("saved") : t("save");

  return (
    <Button
      aria-label={withLabel ? undefined : label}
      aria-pressed={saved}
      className={className}
      disabled={toggle.isPending}
      onClick={(event) => {
        // Cards are links: toggling must not open the product.
        event.preventDefault();
        event.stopPropagation();
        toggle.mutate({ productId, saved });
      }}
      size={withLabel ? "lg" : "icon"}
      title={label}
      type="button"
      variant={withLabel ? "outline" : "secondary"}
    >
      <HeartIcon
        className={cn(saved && "fill-primary text-primary")}
        data-saved={saved}
      />
      {withLabel ? text : null}
    </Button>
  );
};
