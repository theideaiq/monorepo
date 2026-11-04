"use client";

import { track } from "@repo/analytics/client";
import { Button } from "@repo/design-system/components/ui/button";
import { Share2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { toast } from "sonner";
import { shareLink } from "@/lib/native/share";

interface ShareButtonProps {
  /** What is shared, for analytics ("event"). */
  readonly contentType: string;
  /** Its id, for analytics. */
  readonly itemId: string;
  /** The button's text. */
  readonly label: string;
  readonly size?: ComponentProps<typeof Button>["size"];
  readonly title: string;
  /** Absolute. */
  readonly url: string;
  readonly variant?: ComponentProps<typeof Button>["variant"];
}

/**
 * Shares a page: the system share sheet in the apps and in browsers with the
 * Web Share API, otherwise the link goes to the clipboard with a toast
 * (`shareLink`).
 */
export const ShareButton = ({
  contentType,
  itemId,
  label,
  size = "sm",
  title,
  url,
  variant = "outline",
}: ShareButtonProps) => {
  const t = useTranslations("app.native.share");

  const share = async () => {
    const outcome = await shareLink({ title, url });
    if (outcome === "copied") {
      toast.success(t("copied"));
    } else if (outcome === "unavailable") {
      toast.error(t("failed"));
    }
    if (outcome === "shared" || outcome === "copied") {
      track("share", {
        contentType,
        itemId,
        method: outcome === "shared" ? "share" : "copy",
      });
    }
  };

  return (
    <Button onClick={share} size={size} type="button" variant={variant}>
      <Share2Icon aria-hidden="true" />
      {label}
    </Button>
  );
};
