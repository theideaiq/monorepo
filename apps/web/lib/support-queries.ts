"use client";

import { useAuth } from "@repo/auth/provider";
import type { Enums } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/**
 * Support tickets. RLS shows customers their own tickets and only the
 * public messages on them (staff notes never reach the app).
 */

export type TicketStatus = Enums<"ticket_status">;
export type TicketTopic = Enums<"ticket_topic">;

export const TICKET_TOPICS: readonly TicketTopic[] = [
  "order",
  "rental",
  "plus",
  "account",
  "other",
];

export const isTicketTopic = (value: string | null): value is TicketTopic =>
  TICKET_TOPICS.includes(value as TicketTopic);

export const MAX_SUBJECT_LENGTH = 200;
export const MAX_MESSAGE_LENGTH = 5000;

/** Customers can write on every ticket that isn't closed. */
export const canReply = (status: TicketStatus) => status !== "closed";

const TICKET_COLUMNS =
  "id, number, subject, topic, status, order_id, last_message_at, created_at, order:orders (id, number)" as const;

export const useTickets = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("support_tickets")
          .select(TICKET_COLUMNS)
          .eq("user_id", requireUserId(user?.id))
          .order("last_message_at", { ascending: false })
          .limit(50)
      ),
    queryKey: queryKeys.tickets(user?.id ?? ""),
  });
};

export const useTicket = (ticketId: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user && ticketId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("support_tickets")
          .select(TICKET_COLUMNS)
          .eq("id", ticketId)
          .maybeSingle()
      ),
    queryKey: queryKeys.ticket(ticketId),
    refetchOnWindowFocus: true,
  });
};

export const useTicketMessages = (ticketId: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user && ticketId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("support_messages")
          .select("id, author_id, body, created_at")
          .eq("ticket_id", ticketId)
          .order("created_at")
      ),
    queryKey: queryKeys.ticketMessages(ticketId),
    refetchOnWindowFocus: true,
  });
};

const useRefreshTickets = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["tickets"] });
};

export interface NewTicket {
  body: string;
  orderId: string | null;
  subject: string;
  topic: TicketTopic;
}

/** create_support_ticket(): the ticket and its first message at once. */
export const useCreateTicket = () => {
  const { supabase } = useAuth();
  const refresh = useRefreshTickets();
  return useMutation({
    mutationFn: async ({ body, orderId, subject, topic }: NewTicket) =>
      unwrap(
        await supabase.rpc("create_support_ticket", {
          ticket_body: body.trim(),
          ticket_subject: subject.trim(),
          ticket_topic: topic,
          ...(orderId ? { ticket_order: orderId } : {}),
        })
      ),
    onSettled: refresh,
  });
};

export const useReplyToTicket = (ticketId: string) => {
  const { supabase, user } = useAuth();
  const refresh = useRefreshTickets();
  return useMutation({
    mutationFn: async (body: string) => {
      unwrap(
        await supabase.from("support_messages").insert({
          author_id: requireUserId(user?.id),
          body: body.trim(),
          ticket_id: ticketId,
        })
      );
    },
    onSettled: refresh,
  });
};

export const useCloseTicket = () => {
  const { supabase } = useAuth();
  const refresh = useRefreshTickets();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      unwrap(await supabase.rpc("close_support_ticket", { ticket: ticketId }));
    },
    onSettled: refresh,
  });
};
