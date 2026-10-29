"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
