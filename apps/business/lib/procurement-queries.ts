"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, unwrap } from "./queries";

/**
 * The IDEA Suite procurement for the active company, through RLS: every
 * member sees its requests, sent quotes, purchase orders and invoices;
 * owners and admins send requests and answer quotes.
 */

const keys = {
  invoices: (organizationId: string) =>
    ["procurement-invoices", organizationId] as const,
  request: (requestId: string) => ["procurement-request", requestId] as const,
  requests: (organizationId: string) =>
    ["procurement-requests", organizationId] as const,
};

export const useProcurementRequests = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("procurement_requests")
          .select("id, number, title, status, budget, needed_by, created_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(100)
      ),
    queryKey: keys.requests(organizationId),
  });
};

export const useProcurementRequest = (requestId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const request = unwrap(
        await supabase
          .from("procurement_requests")
          .select(
            "*, quotes (*, quote_lines (*), purchase_orders (*, invoices (*)))"
          )
          .eq("id", requestId)
          .maybeSingle()
      );
      if (!request) {
        return null;
      }
      return {
        ...request,
        quotes: [...request.quotes]
          .sort((a, b) => a.number - b.number)
          .map((quote) => ({
            ...quote,
            quote_lines: [...quote.quote_lines].sort(
              (a, b) => a.position - b.position
            ),
          })),
      };
    },
    queryKey: keys.request(requestId),
  });
};

export interface NewRequest {
  budget: number | null;
  details: string;
  neededBy: string | null;
  title: string;
}

export const useCreateProcurementRequest = (organizationId: string) => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewRequest) =>
      unwrap(
        await supabase
          .from("procurement_requests")
          .insert({
            budget: input.budget,
            created_by: requireUserId(user?.id),
            details: input.details.trim() || null,
            needed_by: input.neededBy,
            organization_id: organizationId,
            title: input.title.trim(),
          })
          .select("id")
          .single()
      ),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: keys.requests(organizationId),
      }),
  });
};

const useRefreshRequest = (organizationId: string, requestId: string) => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.request(requestId) }),
      queryClient.invalidateQueries({
        queryKey: keys.requests(organizationId),
      }),
    ]);
};

export const useDecideQuote = (organizationId: string, requestId: string) => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      accept: boolean;
      quoteId: string;
      reference?: string;
    }) =>
      unwrap(
        await supabase.rpc("decide_quote", {
          accept: input.accept,
          quote: input.quoteId,
          reference: input.reference?.trim() || undefined,
        })
      ),
    onSettled: useRefreshRequest(organizationId, requestId),
  });
};

export const useCancelProcurementRequest = (
  organizationId: string,
  requestId: string
) => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async () => {
      unwrap(
        await supabase.rpc("cancel_procurement_request", {
          request: requestId,
        })
      );
    },
    onSettled: useRefreshRequest(organizationId, requestId),
  });
};

export const useInvoices = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("invoices")
          .select(
            "id, number, amount, status, description, due_on, issued_at, paid_at, purchase_orders (number, customer_reference, quotes (request_id))"
          )
          .eq("organization_id", organizationId)
          .order("issued_at", { ascending: false })
          .limit(100)
      ),
    queryKey: keys.invoices(organizationId),
  });
};

/** What needs the company's attention, for the Overview. */
export const useSuiteOverview = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const [requests, quotes, invoices, seats, candidates] = await Promise.all(
        [
          supabase
            .from("procurement_requests")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .in("status", ["submitted", "quoted"]),
          supabase
            .from("quotes")
            .select("id, procurement_requests!inner (organization_id)", {
              count: "exact",
              head: true,
            })
            .eq("status", "sent")
            .eq("procurement_requests.organization_id", organizationId),
          supabase
            .from("invoices")
            .select("amount")
            .eq("organization_id", organizationId)
            .eq("status", "issued"),
          supabase
            .from("plus_seats")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("status", "active"),
          supabase
            .from("candidates")
            .select("id, job_requests!inner (organization_id)", {
              count: "exact",
              head: true,
            })
            .eq("status", "proposed")
            .eq("job_requests.organization_id", organizationId),
        ]
      );
      const unpaid = unwrap(invoices) ?? [];
      for (const result of [requests, quotes, seats, candidates]) {
        if (result.error) {
          throw result.error;
        }
      }
      return {
        candidatesToReview: candidates.count ?? 0,
        openRequests: requests.count ?? 0,
        plusSeats: seats.count ?? 0,
        quotesToAnswer: quotes.count ?? 0,
        unpaidInvoices: unpaid.length,
        unpaidTotal: unpaid.reduce((sum, row) => sum + row.amount, 0),
      };
    },
    queryKey: ["suite-overview", organizationId] as const,
  });
};
