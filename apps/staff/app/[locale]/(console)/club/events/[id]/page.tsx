import { localized } from "@repo/commerce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { env } from "@/env";
import { toBaghdadInput } from "@/lib/admin/dates";
import { formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { EventForm } from "../../_components/event-form";
import { checkInRsvp, deleteEvent, removeRsvp } from "../../actions";

const EventPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { supabase } = await requireSection("editorial", "write");
  const locale = await getLocale();
  const t = await getTranslations("admin.editorial");
  const tCommon = await getTranslations("admin.common");
  const format = formatters(locale);

  const [{ data: event }, { data: rsvps }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("event_rsvps")
      .select("user_id, created_at, checked_in_at")
      .eq("event_id", id)
      .order("created_at"),
  ]);
  if (!event) {
    notFound();
  }
  const names = await profileNames(
    supabase,
    (rsvps ?? []).map((rsvp) => rsvp.user_id)
  );

  return (
    <>
      <PageHeader
        back={{ href: "/club/events", label: t("tabs.events") }}
        description={format.dateTime(event.starts_at)}
        title={localized(event, "title", locale)}
      >
        <ActionButton
          action={deleteEvent}
          confirm={{
            description: t("events.deleteDescription"),
            title: tCommon("deleteConfirm"),
          }}
          fields={{ id: event.id }}
          variant="destructive"
        >
          {tCommon("delete")}
        </ActionButton>
      </PageHeader>
      <PageBody className="xl:grid-cols-[1fr_22rem]">
        <EventForm
          endsAt={toBaghdadInput(event.ends_at)}
          event={event}
          rsvpOpensAt={toBaghdadInput(event.rsvp_opens_at)}
          startsAt={toBaghdadInput(event.starts_at)}
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        />
        <Panel
          description={
            event.capacity
              ? t("events.seats", {
                  capacity: format.number(event.capacity),
                  count: format.number(rsvps?.length ?? 0),
                })
              : format.number(rsvps?.length ?? 0)
          }
          title={t("events.rsvpList")}
        >
          {(rsvps ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("events.noRsvps")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("events.attendee")}</TableHead>
                  <TableHead>{t("events.rsvpDate")}</TableHead>
                  <TableHead>{t("events.checkedIn")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rsvps ?? []).map((rsvp) => (
                  <TableRow key={rsvp.user_id}>
                    <TableCell>
                      {names.get(rsvp.user_id) ?? t("events.unnamed")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format.date(rsvp.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {rsvp.checked_in_at ? (
                        format.dateTime(rsvp.checked_in_at)
                      ) : (
                        <ActionButton
                          action={checkInRsvp}
                          fields={{ eventId: event.id, userId: rsvp.user_id }}
                          size="sm"
                          variant="secondary"
                        >
                          {t("events.checkIn")}
                        </ActionButton>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <ActionButton
                        action={removeRsvp}
                        confirm={{ title: t("events.removeRsvp") }}
                        fields={{ eventId: event.id, userId: rsvp.user_id }}
                        variant="ghost"
                      >
                        {tCommon("delete")}
                      </ActionButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </PageBody>
    </>
  );
};

export default EventPage;
