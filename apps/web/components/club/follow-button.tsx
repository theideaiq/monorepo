"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { localePath } from "@repo/internationalization";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { Bell, BellOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useFollowOpportunity, useMyFollows } from "@/lib/opportunity-queries";

/**
 * "Notify me" on an opportunity: following it tells the member when it
 * opens (again) and three days before its deadline. Signed out, it signs
 * in and comes back here.
 */
export const FollowButton = ({
  opportunityId,
}: {
  readonly opportunityId: string;
}) => {
  const t = useTranslations("web.opportunities.follow");
  const { loading, user } = useAuth();
  const locale = useLocale();
  const pathname = usePathname();
  const follows = useMyFollows();
  const follow = useFollowOpportunity();
  const following = Boolean(
    follows.data?.some((row) => row.opportunity_id === opportunityId)
  );

  if (!user) {
    return (
      <Button asChild className="w-full" disabled={loading} variant="outline">
        <Link
          href={{
            pathname: "/sign-in",
            query: { return_to: localePath(locale, pathname) },
          }}
        >
          <Bell aria-hidden="true" />
          {t("notifyMe")}
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        aria-pressed={following}
        className="w-full"
        disabled={follow.isPending || follows.isPending}
        onClick={() => follow.mutate({ follow: !following, opportunityId })}
        variant={following ? "secondary" : "outline"}
      >
        {following ? (
          <BellOff aria-hidden="true" />
        ) : (
          <Bell aria-hidden="true" />
        )}
        {t(following ? "stop" : "notifyMe")}
      </Button>
      <p className="text-muted-foreground text-xs">
        {t(following ? "following" : "hint")}
      </p>
      {follow.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};
