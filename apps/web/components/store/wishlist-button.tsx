"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { HeartIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toggleLocalSaved, useLocallySaved } from "@/lib/local-saved";
import { useIsWishlisted, useToggleWishlist } from "@/lib/wishlist-queries";

/**
 * Saves a product to Saved, or removes it. Signed out, the heart is kept
 * in this browser and moves into Saved at sign-in.
 */
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
  const savedHere = useIsWishlisted(productId);
  const savedLocally = useLocallySaved(productId);
  const toggle = useToggleWishlist();
  const saved = user ? savedHere : savedLocally;

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
        if (user) {
          toggle.mutate({ productId, saved });
        } else {
          toggleLocalSaved(productId);
        }
      }}
      size={withLabel ? "lg" : "icon"}
      title={label}
      type="button"
      variant={withLabel ? "outline" : "secondary"}
    >
      <HeartIcon
        className={cn(saved && "fill-primary text-pink-text")}
        data-saved={saved}
      />
      {withLabel ? text : null}
    </Button>
  );
};
