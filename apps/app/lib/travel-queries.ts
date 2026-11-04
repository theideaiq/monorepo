"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, unwrap } from "./queries";
import {
  type DocumentStatus,
  findKit,
  TRAVEL_REQUIREMENT_COLUMNS,
  type TravelRequirement,
} from "./travel-kit";

/**
 * The member's Travel Kits, read and written with their own session, so
 * Row Level Security keeps every kit, status and tick private to them.
 */

const KIT_COLUMNS =
  "id, route_id, opportunity_id, appointment_on, departure_on, minor, notes, created_at, route:travel_routes (id, slug, country, visa_ar, visa_en, apply_at_ar, apply_at_en, ask_ar, ask_en, note_ar, note_en, checked_on), opportunity:opportunities (id, slug, title_ar, title_en)";

const keys = {
  documents: (userId: string) => ["travel", "documents", userId] as const,
  kit: (kitId: string) => ["travel", "kit", kitId] as const,
  kits: (userId: string) => ["travel", "kits", userId] as const,
  requirements: (routeId: string, opportunityId: string | null) =>
    ["travel", "requirements", routeId, opportunityId] as const,
  ticks: (kitId: string) => ["travel", "ticks", kitId] as const,
};

/** The member's kits, newest first, with their route and program. */
export const useMyKits = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("travel_kits")
          .select(KIT_COLUMNS)
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: keys.kits(user?.id ?? ""),
  });
};

export type Kit = NonNullable<ReturnType<typeof useMyKits>["data"]>[number];

/** One of the member's kits (null when it isn't theirs or was deleted). */
export const useKit = (kitId: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("travel_kits")
          .select(KIT_COLUMNS)
          .eq("id", kitId)
          .maybeSingle()
      ),
    queryKey: keys.kit(kitId),
  });
};

/** The route's lines and the program's extras. */
export const useKitRequirements = (
  routeId: string | undefined,
  opportunityId: string | null | undefined
) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(routeId),
    queryFn: async () => {
      const filter = opportunityId
        ? `route_id.eq.${routeId},opportunity_id.eq.${opportunityId}`
        : `route_id.eq.${routeId}`;
      return (unwrap(
        await supabase
          .from("travel_requirements")
          .select(TRAVEL_REQUIREMENT_COLUMNS)
          .or(filter)
          .order("position")
      ) ?? []) as TravelRequirement[];
    },
    queryKey: keys.requirements(routeId ?? "", opportunityId ?? null),
  });
};

/** Where the member stands with each kind of document, for every kit. */
export const useDocumentStatuses = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      new Map(
        (
          unwrap(
            await supabase.from("travel_documents").select("doc_key, status")
          ) ?? []
        ).map((row) => [row.doc_key, row.status] as const)
      ) as ReadonlyMap<string, DocumentStatus>,
    queryKey: keys.documents(user?.id ?? ""),
  });
};

/** The lines ticked in one kit. */
export const useKitTicks = (kitId: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      new Set(
        (
          unwrap(
            await supabase
              .from("travel_kit_ticks")
              .select("requirement_id")
              .eq("kit_id", kitId)
          ) ?? []
        ).map((row) => row.requirement_id)
      ) as ReadonlySet<string>,
    queryKey: keys.ticks(kitId),
  });
};

const UNIQUE_VIOLATION = "23505";

/**
 * Opens the member's kit for this route (and program), starting it when
 * there is none; returns its id.
 */
export const useStartKit = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      opportunityId,
      routeId,
    }: {
      opportunityId: string | null;
      routeId: string;
    }) => {
      const userId = requireUserId(user?.id);
      const existing = async () => {
        let query = supabase
          .from("travel_kits")
          .select("id, route_id, opportunity_id")
          .eq("route_id", routeId);
        query = opportunityId
          ? query.eq("opportunity_id", opportunityId)
          : query.is("opportunity_id", null);
        return findKit(unwrap(await query) ?? [], routeId, opportunityId);
      };
      const found = await existing();
      if (found) {
        return found.id;
      }
      const { data, error } = await supabase
        .from("travel_kits")
        .insert({
          opportunity_id: opportunityId,
          route_id: routeId,
          user_id: userId,
        })
        .select("id")
        .single();
      if (error?.code === UNIQUE_VIOLATION) {
        const raced = await existing();
        if (raced) {
          return raced.id;
        }
      }
      if (error || !data) {
        throw error ?? new Error("No kit returned");
      }
      return data.id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.kits(user?.id ?? "") }),
  });
};

/** Changes the kit's dates, under-18 switch or notes. */
export const useUpdateKit = (kitId: string) => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      changes: Partial<{
        appointment_on: string | null;
        departure_on: string | null;
        minor: boolean;
        notes: string | null;
      }>
    ) =>
      unwrap(
        await supabase.from("travel_kits").update(changes).eq("id", kitId)
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.kit(kitId) }),
        queryClient.invalidateQueries({ queryKey: keys.kits(user?.id ?? "") }),
      ]),
  });
};

/** Sets where the member stands with a kind of document (every kit sees it). */
export const useSetDocumentStatus = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      docKey,
      status,
    }: {
      docKey: string;
      status: DocumentStatus;
    }) =>
      unwrap(
        await supabase
          .from("travel_documents")
          .upsert(
            { doc_key: docKey, status, user_id: requireUserId(user?.id) },
            { onConflict: "user_id,doc_key" }
          )
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: keys.documents(user?.id ?? ""),
      }),
  });
};

/** Ticks or unticks a task or question in one kit. */
export const useTickKit = (kitId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      done,
      requirementId,
    }: {
      done: boolean;
      requirementId: string;
    }) => {
      if (done) {
        const { error } = await supabase
          .from("travel_kit_ticks")
          .insert({ kit_id: kitId, requirement_id: requirementId });
        if (error && error.code !== UNIQUE_VIOLATION) {
          throw error;
        }
        return;
      }
      unwrap(
        await supabase
          .from("travel_kit_ticks")
          .delete()
          .eq("kit_id", kitId)
          .eq("requirement_id", requirementId)
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.ticks(kitId) }),
  });
};

/** Deletes a kit (its ticks go with it; document statuses stay). */
export const useDeleteKit = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kitId: string) =>
      unwrap(await supabase.from("travel_kits").delete().eq("id", kitId)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.kits(user?.id ?? "") }),
  });
};
