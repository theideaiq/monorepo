"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { localePath } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMyRsvps, useRsvp, useRsvpWindow } from "@/lib/community-queries";
import { toRsvpError } from "@/lib/errors";

interface RsvpButtonProps {
  readonly eventId: string;
  /** No seats left (counted on the server). */
  readonly full: boolean;
}

/** When RSVPs open for the member, or a note that Plus is already in. */
const RsvpOpening = ({ eventId }: { readonly eventId: string }) => {
  const t = useTranslations("app.events");
  const locale = useLocale();
  const opening = useRsvpWindow(eventId).data;
  const now = Date.now();
  if (!opening?.opensAt) {
    return null;
  }
  if (new Date(opening.opensAt).getTime() > now) {
    return (
      <p className="text-muted-foreground text-xs">
        {t("opensOn", { date: formatDateTime(opening.opensAt, locale) })}
      </p>
    );
  }
  // A Plus member's early window: everyone else joins later.
  const everyone = opening.plusOpensAt
    ? new Date(opening.plusOpensAt).getTime() + 48 * 60 * 60 * 1000
    : 0;
  return everyone > now ? (
    <p className="text-muted-foreground text-xs">
      {t("plusEarly", {
        date: formatDateTime(new Date(everyone).toISOString(), locale),
      })}
    </p>
  ) : null;
};

/**
 * RSVP on an event page: going or cancelling for signed-in members (Plus
 * members 48 hours before everyone), a sign-in that comes back here for
 * everyone else.
 */
export const RsvpButton = ({ eventId, full }: RsvpButtonProps) => {
  const t = useTranslations("app.events");
  const { loading, user } = useAuth();
  const locale = useLocale();
  const pathname = usePathname();
  const mine = useMyRsvps();
  const rsvp = useRsvp();
  const going = Boolean(mine.data?.some((row) => row.event_id === eventId));
  const opening = useRsvpWindow(eventId).data;
  const notOpen = Boolean(
    opening?.opensAt && new Date(opening.opensAt).getTime() > Date.now()
  );
  // Seats this member can take (held Blaze seats aside).
  const noSeat = opening?.seatsLeft === 0;

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

  const blocked = (full || noSeat || notOpen) && !going;
  let label = going ? t("cancelRsvp") : t("rsvp");
  if (blocked) {
    label = notOpen ? t("notOpen") : t("full");
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
      {going ? null : <RsvpOpening eventId={eventId} />}
      {rsvp.isError ? (
        <p className="text-destructive text-xs" role="alert">
          {t(`errors.${toRsvpError(rsvp.error)}`)}
        </p>
      ) : null}
    </div>
  );
};
