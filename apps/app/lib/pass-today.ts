/**
 * Pass → Today: only what is due, in this order: a delivery on its way, a
 * Plus rental due back (within two days, or late), an event today, and a
 * Family request waiting for the manager. Empty when nothing is.
 */

export type TodayItem =
  | { id: string; kind: "delivery"; number: number }
  | { dueAt: string; id: string; kind: "dueBack"; late: boolean; name: string }
  | { id: string; kind: "event"; slug: string; startsAt: string; title: string }
  | { count: number; id: "family"; kind: "family" };

interface TodayInput {
  events: readonly {
    id: string;
    slug: string;
    starts_at: string;
    title: string;
  }[];
  familyRequests: number;
  now?: Date;
  orders: readonly { id: string; number: number; status: string }[];
  rentals: readonly {
    due_at: string | null;
    id: string;
    kind: string;
    name: string;
    status: string;
  }[];
}

const DUE_SOON_MS = 2 * 24 * 60 * 60 * 1000;

/** A `YYYY-MM-DD` day in Baghdad. */
const baghdadDay = (at: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Baghdad",
    year: "numeric",
  }).format(at);

export const todayItems = ({
  events,
  familyRequests,
  now = new Date(),
  orders,
  rentals,
}: TodayInput): TodayItem[] => {
  const today = baghdadDay(now);
  return [
    ...orders
      .filter((order) => order.status === "shipped")
      .map((order) => ({
        id: order.id,
        kind: "delivery" as const,
        number: order.number,
      })),
    ...rentals
      .filter(
        (rental) =>
          rental.kind === "plus" &&
          rental.due_at !== null &&
          (rental.status === "overdue" ||
            (rental.status === "active" &&
              new Date(rental.due_at).getTime() - now.getTime() <= DUE_SOON_MS))
      )
      .map((rental) => ({
        dueAt: rental.due_at ?? "",
        id: rental.id,
        kind: "dueBack" as const,
        late: rental.status === "overdue",
        name: rental.name,
      })),
    ...events
      .filter(
        (event) =>
          baghdadDay(new Date(event.starts_at)) === today &&
          new Date(event.starts_at).getTime() >
            now.getTime() - 6 * 60 * 60 * 1000
      )
      .map((event) => ({
        id: event.id,
        kind: "event" as const,
        slug: event.slug,
        startsAt: event.starts_at,
        title: event.title,
      })),
    ...(familyRequests > 0
      ? [
          {
            count: familyRequests,
            id: "family" as const,
            kind: "family" as const,
          },
        ]
      : []),
  ];
};
