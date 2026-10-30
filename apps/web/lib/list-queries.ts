"use client";

import { useAuth } from "@repo/auth/provider";
import type { Json } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ImportItem } from "./list-import";
import { queryKeys, requireUserId, unwrap } from "./queries";

/** The member's lists of saved items, private or shared by link. */

export interface SavedList {
  id: string;
  name: string;
  share_token: string;
  shared: boolean;
}

const listsKey = (userId: string) => ["saved-lists", userId] as const;

export const useSavedLists = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("saved_lists")
          .select("id, name, shared, share_token")
          .eq("user_id", requireUserId(user?.id))
          .order("created_at")
      ) ?? [],
    queryKey: listsKey(user?.id ?? ""),
  });
};

const useListMutation = <Input>(
  run: (
    supabase: ReturnType<typeof useAuth>["supabase"],
    input: Input
  ) => PromiseLike<{ data: unknown; error: unknown }>
) => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Input) => unwrap(await run(supabase, input)),
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: listsKey(user?.id ?? ""),
      });
      // Deleting a list takes its items out of it.
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist(user?.id ?? ""),
      });
    },
  });
};

export const useCreateList = () =>
  useListMutation((supabase, name: string) =>
    supabase.from("saved_lists").insert({ name: name.trim() })
  );

/** Shares a list by link, or makes it private again. */
export const useShareList = () =>
  useListMutation((supabase, input: { id: string; shared: boolean }) =>
    supabase
      .from("saved_lists")
      .update({ shared: input.shared })
      .eq("id", input.id)
  );

export const useDeleteList = () =>
  useListMutation((supabase, id: string) =>
    supabase.from("saved_lists").delete().eq("id", id)
  );

/** Items imported into a list that the store doesn't have yet. */
export interface WantedItem {
  creator: string | null;
  id: string;
  kind: string;
  list_id: string | null;
  source: string;
  title: string;
}

const wantedKey = (userId: string) => ["wanted-items", userId] as const;

export const useWantedItems = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async (): Promise<WantedItem[]> =>
      unwrap(
        await supabase
          .from("wanted_items")
          .select("id, list_id, source, kind, title, creator")
          .eq("user_id", requireUserId(user?.id))
          .is("matched_at", null)
          .order("created_at", { ascending: false })
          .limit(2000)
      ) ?? [],
    queryKey: wantedKey(user?.id ?? ""),
  });
};

const useWantedMutation = <Input, Output>(
  run: (
    supabase: ReturnType<typeof useAuth>["supabase"],
    input: Input
  ) => Promise<Output>
) => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Input) => run(supabase, input),
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: wantedKey(user?.id ?? ""),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist(user?.id ?? ""),
      });
    },
  });
};

/**
 * "Import your list": what the store has joins the list with price-drop
 * and back-in-stock alerts; the rest waits as wanted items.
 */
export const useImportList = () =>
  useWantedMutation(
    async (supabase, input: { items: ImportItem[]; listId: string }) => {
      const rows = unwrap(
        await supabase.rpc("import_list_items", {
          items: input.items as unknown as Json,
          list: input.listId,
        })
      );
      return rows?.[0] ?? { matched: 0, wanted: 0 };
    }
  );

export const useRemoveWanted = () =>
  useWantedMutation(async (supabase, id: string) => {
    unwrap(await supabase.from("wanted_items").delete().eq("id", id));
  });
