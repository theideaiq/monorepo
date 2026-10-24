import { describe, expect, test } from "vitest";
import {
  compareTickets,
  parseAssignee,
  parseTicketSearch,
  replySchema,
  statusesFor,
  ticketUpdateSchema,
} from "./support";

const id = "00000000-0000-4000-8000-000000000001";

describe("support queue", () => {
  test("open tickets first, then oldest waiting first", () => {
    const tickets = [
      { last_message_at: "2026-11-03T10:00:00Z", status: "pending" as const },
      { last_message_at: "2026-11-02T10:00:00Z", status: "open" as const },
      { last_message_at: "2026-11-01T10:00:00Z", status: "closed" as const },
      { last_message_at: "2026-11-01T09:00:00Z", status: "open" as const },
      { last_message_at: "2026-11-01T08:00:00Z", status: "resolved" as const },
    ];
    expect(
      [...tickets]
        .sort(compareTickets)
        .map((ticket) => `${ticket.status} ${ticket.last_message_at}`)
    ).toEqual([
      "open 2026-11-01T09:00:00Z",
      "open 2026-11-02T10:00:00Z",
      "pending 2026-11-03T10:00:00Z",
      "resolved 2026-11-01T08:00:00Z",
      "closed 2026-11-01T10:00:00Z",
    ]);
  });

  test("status views", () => {
    expect(statusesFor("active")).toEqual(["open", "pending"]);
    expect(statusesFor("resolved")).toEqual(["resolved"]);
    expect(statusesFor("all")).toBeNull();
  });

  test("search by number or subject", () => {
    expect(parseTicketSearch("#1042")).toEqual({ number: 1042 });
    expect(parseTicketSearch(" 1042 ")).toEqual({ number: 1042 });
    expect(parseTicketSearch("late delivery")).toEqual({
      subject: "late delivery",
    });
    expect(parseTicketSearch("PS5 #2")).toEqual({ subject: "PS5 #2" });
    expect(parseTicketSearch("  ")).toBeNull();
  });

  test("assignee filter", () => {
    expect(parseAssignee("me")).toEqual({ kind: "me" });
    expect(parseAssignee("none")).toEqual({ kind: "none" });
    expect(parseAssignee(id)).toEqual({ id, kind: "user" });
    expect(parseAssignee("someone")).toEqual({ kind: "any" });
  });
});

describe("ticket forms", () => {
  test("a reply or an internal note", () => {
    expect(replySchema.parse({ body: " Hi ", ticketId: id })).toEqual({
      body: "Hi",
      internal: false,
      ticketId: id,
    });
    expect(
      replySchema.parse({ body: "note", internal: "true", ticketId: id })
        .internal
    ).toBe(true);
    expect(replySchema.safeParse({ body: "  ", ticketId: id }).success).toBe(
      false
    );
  });

  test("status, priority and assignee", () => {
    expect(
      ticketUpdateSchema.parse({
        assignedTo: "",
        priority: "urgent",
        status: "pending",
        ticketId: id,
      })
    ).toEqual({
      assignedTo: null,
      priority: "urgent",
      status: "pending",
      ticketId: id,
    });
    expect(
      ticketUpdateSchema.safeParse({
        priority: "normal",
        status: "waiting",
        ticketId: id,
      }).success
    ).toBe(false);
  });
});
