"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { localePath } from "@repo/internationalization";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMyRsvps, useRsvp } from "@/lib/community-queries";
import { toRsvpError } from "@/lib/errors";

interface RsvpButtonProps {
  readonly eventId: string;
  /** No seats left (counted on the server). */
  readonly full: boolean;
}

/**
 * RSVP on an event page: going or cancelling for signed-in members, a
 * sign-in that comes back here for everyone else.
 */
export const RsvpButton = ({ eventId, full }: RsvpButtonProps) => {
  const t = useTranslations("app.events");
  const { loading, user } = useAuth();
  const locale = useLocale();
  const pathname = usePathname();
  const mine = useMyRsvps();
  const rsvp = useRsvp();
  const going = Boolean(mine.data?.some((row) => row.event_id === eventId));

  if (!user) {
    return (
      <Button asChild className="w-full" disabled={loading}>
        <Link
          href={{
            pathname: "/sign-in",
            query: { return_to: localePath(locale, pathname) },
          }}
        >
          {t("rsvp")}
        </Link>
      </Button>
    );
  }

  const blocked = full && !going;
  let label = going ? t("cancelRsvp") : t("rsvp");
  if (blocked) {
    label = t("full");
  }
  if (rsvp.isPending) {
    label = t("rsvping");
  }
  return (
    <div className="grid gap-2">
      <Button
        className="w-full"
        disabled={rsvp.isPending || mine.isPending || blocked}
        onClick={() => rsvp.mutate({ eventId, going: !going })}
        variant={going ? "outline" : "default"}
      >
        {label}
      </Button>
      {rsvp.isError ? (
        <p className="text-destructive text-xs" role="alert">
          {t(`errors.${toRsvpError(rsvp.error)}`)}
        </p>
      ) : null}
    </div>
  );
};
