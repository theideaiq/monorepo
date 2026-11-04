"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { localePath } from "@repo/internationalization";
import {
  Link,
  usePathname,
  useRouter,
} from "@repo/internationalization/navigation";
import { FolderOpenIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { findKit, kitPath } from "@/lib/travel-kit";
import { useMyKits, useStartKit } from "@/lib/travel-queries";

/**
 * "Start my Travel Kit" for a route (and the program it's for): opens the
 * member's kit, starting it the first time. Signed out, it signs in and
 * comes back here.
 */
export const StartKitButton = ({
  className,
  opportunityId = null,
  routeId,
  variant = "default",
}: {
  readonly className?: string;
  readonly opportunityId?: string | null;
  readonly routeId: string;
  readonly variant?: "default" | "outline";
}) => {
  const t = useTranslations("app.travel.start");
  const { loading, user } = useAuth();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const kits = useMyKits();
  const start = useStartKit();
  const existing = kits.data
    ? findKit(kits.data, routeId, opportunityId)
    : null;

  if (!user) {
    return (
      <Button
        asChild
        className={className}
        disabled={loading}
        variant={variant}
      >
        <Link
          href={{
            pathname: "/sign-in",
            query: { return_to: localePath(locale, pathname) },
          }}
        >
          <FolderOpenIcon aria-hidden="true" />
          {t("start")}
        </Link>
      </Button>
    );
  }

  if (existing) {
    return (
      <Button asChild className={className} variant={variant}>
        <Link href={kitPath(existing.id)}>
          <FolderOpenIcon aria-hidden="true" />
          {t("open")}
        </Link>
      </Button>
    );
  }

  return (
    <div className="grid gap-2">
      <Button
        className={className}
        disabled={start.isPending || kits.isPending}
        onClick={() =>
          start.mutate(
            { opportunityId, routeId },
            { onSuccess: (kitId) => router.push(kitPath(kitId)) }
          )
        }
        variant={variant}
      >
        <FolderOpenIcon aria-hidden="true" />
        {t("start")}
      </Button>
      {start.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};
