import { Constants, type Enums } from "@repo/database";
import { z } from "zod";
import type { Tone } from "@/components/admin/status-badge";
import { checkbox, optionalUuid, text, uuid } from "./forms";

export type TicketStatus = Enums<"ticket_status">;
export type TicketPriority = Enums<"ticket_priority">;
export type TicketTopic = Enums<"ticket_topic">;

export const ticketStatuses = Constants.public.Enums.ticket_status;
export const ticketPriorities = Constants.public.Enums.ticket_priority;
export const ticketTopics = Constants.public.Enums.ticket_topic;

/**
 * The queue's status filter: "active" (open and pending, the default),
 * one status, or every ticket.
 */
export const queueViews = ["active", ...ticketStatuses, "all"] as const;
export type QueueView = (typeof queueViews)[number];

export const statusesFor = (view: QueueView): TicketStatus[] | null => {
  if (view === "all") {
    return null;
  }
  if (view === "active") {
    return ["open", "pending"];
  }
  return [view];
};

const statusRank: Record<TicketStatus, number> = {
  closed: 3,
  open: 0,
  pending: 1,
  resolved: 2,
};

const priorityRank: Record<TicketPriority, number> = {
  high: 1,
  low: 3,
  normal: 2,
  urgent: 0,
};

/**
 * Queue order: open tickets first (waiting on staff), then pending,
 * resolved and closed; within a status, whoever has waited longest first.
 * The database sorts the same way (the enum is declared in this order);
 * this is for lists assembled in code.
 */
export const compareTickets = (
  a: { last_message_at: string; status: TicketStatus },
  b: { last_message_at: string; status: TicketStatus }
) =>
  statusRank[a.status] - statusRank[b.status] ||
  a.last_message_at.localeCompare(b.last_message_at);

export const comparePriority = (a: TicketPriority, b: TicketPriority) =>
  priorityRank[a] - priorityRank[b];

export const ticketStatusTone: Record<TicketStatus, Tone> = {
  closed: "neutral",
  open: "warning",
  pending: "info",
  resolved: "success",
};

export const ticketPriorityTone: Record<TicketPriority, Tone> = {
  high: "warning",
  low: "neutral",
  normal: "neutral",
  urgent: "danger",
};

const TICKET_NUMBER = /^#?\s*(\d{1,12})$/;

/**
 * Reads the queue's search box: "#1042" or "1042" looks up a ticket number,
 * anything else searches subjects.
 */
export const parseTicketSearch = (
  value: string
): { number: number } | { subject: string } | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = TICKET_NUMBER.exec(trimmed);
  if (match) {
    return { number: Number(match[1]) };
  }
  return { subject: trimmed };
};

/** The assignee filter: anyone, the signed-in staff member, nobody or one person. */
export type AssigneeFilter =
  | { kind: "any" }
  | { kind: "me" }
  | { kind: "none" }
  | { id: string; kind: "user" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const parseAssignee = (value: string): AssigneeFilter => {
  if (value === "me" || value === "none") {
    return { kind: value };
  }
  if (UUID.test(value)) {
    return { id: value, kind: "user" };
  }
  return { kind: "any" };
};

/** A staff reply or internal note. */
export const replySchema = z.object({
  body: text(5000),
  internal: checkbox,
  ticketId: uuid,
});

/** Status, priority and assignee, changed together from the ticket page. */
export const ticketUpdateSchema = z.object({
  assignedTo: optionalUuid,
  priority: z.enum(ticketPriorities),
  status: z.enum(ticketStatuses),
  ticketId: uuid,
});

/** A ticket opened by staff for a customer, with its first (staff) message. */
export const openTicketSchema = z.object({
  body: text(5000),
  customerId: uuid,
  orderId: optionalUuid,
  subject: text(200),
  topic: z.enum(ticketTopics),
});
