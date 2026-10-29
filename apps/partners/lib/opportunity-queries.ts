"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Partners → Opportunities: the organization's jobs, internships,
 * scholarships, competitions and programs. Owners and admins write drafts
 * and send them for review; The IDEA's editors decide (the database
 * enforces both), and members see how many follow each listing.
 */

export type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
export type OpportunityKind = Database["public"]["Enums"]["opportunity_kind"];
export type OpportunityStatus =
  | "approved"
  | "changes"
  | "closed"
  | "draft"
  | "pending"
  | "rejected";

export const OPPORTUNITY_KINDS: readonly OpportunityKind[] = [
  "job",
  "internship",
  "scholarship",
  "competition",
  "program",
];

export interface OpportunityInput {
  applicantFee: number;
  applyUrl: string;
  deadline: string | null;
  descriptionAr: string;
  descriptionEn: string;
  endsOn: string | null;
  feeNote: string;
  kind: OpportunityKind;
  location: string;
  opensAt: string | null;
  remote: boolean;
  startsOn: string | null;
  summaryAr: string;
  summaryEn: string;
  titleAr: string;
  titleEn: string;
}

const opportunitiesKey = (organizationId: string) =>
  ["opportunities", organizationId] as const;

export const useOpportunities = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("opportunities")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: opportunitiesKey(organizationId),
  });
};

/** How many members follow each listing (never who). */
export const useOpportunityFollowers = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      new Map(
        (
          unwrap(
            await supabase.rpc("opportunity_followers", {
              org: organizationId,
            })
          ) ?? []
        ).map((row) => [row.opportunity_id, row.followers])
      ),
    queryKey: ["opportunity-followers", organizationId],
  });
};

const blank = (value: string) => value.trim() || null;

const toRow = (input: OpportunityInput) => ({
  applicant_fee: input.applicantFee,
  apply_url: blank(input.applyUrl),
  deadline: input.deadline,
  description_ar: blank(input.descriptionAr),
  description_en: blank(input.descriptionEn),
  ends_on: input.endsOn,
  fee_note: blank(input.feeNote),
  kind: input.kind,
  location: blank(input.location),
  opens_at: input.opensAt,
  remote: input.remote,
  starts_on: input.startsOn,
  summary_ar: blank(input.summaryAr),
  summary_en: blank(input.summaryEn),
  title_ar: input.titleAr.trim(),
  title_en: input.titleEn.trim(),
});

/**
 * Saves a draft (new or existing), or a change to a listed opportunity,
 * which sends it back for review. `submit` sends it for review too.
 */
export const useSaveOpportunity = (organizationId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      submit,
    }: {
      id?: string;
      input: OpportunityInput;
      submit: boolean;
    }) => {
      const row = {
        ...toRow(input),
        ...(submit ? { status: "pending" } : {}),
      };
      if (id) {
        return unwrap(
          await supabase
            .from("opportunities")
            .update(row)
            .eq("id", id)
            .select("id")
            .single()
        );
      }
      return unwrap(
        await supabase
          .from("opportunities")
          // The database makes the slug from the title.
          .insert({ ...row, organization_id: organizationId, slug: "" })
          .select("id")
          .single()
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: opportunitiesKey(organizationId),
      }),
  });
};

/** Sends for review, takes back to a draft, or closes a listed one. */
export const useSetOpportunityStatus = (organizationId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "closed" | "draft" | "pending";
    }) =>
      unwrap(
        await supabase
          .from("opportunities")
          .update({ status })
          .eq("id", id)
          .select("id")
          .single()
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: opportunitiesKey(organizationId),
      }),
  });
};

/** Deletes a draft or a refused listing. */
export const useDeleteOpportunity = (organizationId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await supabase.from("opportunities").delete().eq("id", id)),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: opportunitiesKey(organizationId),
      }),
  });
};
