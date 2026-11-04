"use client";

import { track } from "@repo/analytics/client";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { CalendarPlusIcon, ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export interface CalendarLinks {
  google: string;
  /** The `.ics` file from apps/api; null without NEXT_PUBLIC_API_URL. */
  ics: string | null;
  outlook: string;
}

type Method = keyof CalendarLinks;

/**
 * "Add to calendar" on an event: Google Calendar and Outlook on the web open
 * their new-event forms filled in; the `.ics` file opens in Apple Calendar
 * and most other apps. The links are built on the server
 * (`lib/event-calendar.ts`).
 */
export const AddToCalendar = ({
  eventId,
  links,
}: {
  readonly eventId: string;
  readonly links: CalendarLinks;
}) => {
  const t = useTranslations("web.events");
  const methods: Method[] = links.ics
    ? ["google", "outlook", "ics"]
    : ["google", "outlook"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          <CalendarPlusIcon aria-hidden="true" />
          {t("addToCalendar")}
          <ChevronDownIcon aria-hidden="true" className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {methods.map((method) => (
          <DropdownMenuItem asChild key={method}>
            <a
              href={links[method] ?? undefined}
              onClick={() =>
                track("add_to_calendar", { itemId: eventId, method })
              }
              rel="noopener noreferrer"
              {...(method === "ics" ? {} : { target: "_blank" })}
            >
              {t(`calendar.${method}`)}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
