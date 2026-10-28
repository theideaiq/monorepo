"use client";

import { normalizePhone } from "@repo/auth/phone";
import { useAuth } from "@repo/auth/provider";
import type { OrgRole } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/** Business accounts (organizations): members and invitations, through RLS. */

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * An invitee as the invitations table stores it: an E.164 phone number
 * ("0770…" works) or a lowercase email address. Null when it is neither.
 */
export const parseInvitee = (input: string) => {
  const value = input.trim();
  if (value.includes("@")) {
    const email = value.toLowerCase();
    return EMAIL.test(email) ? email : null;
  }
  return normalizePhone(value);
};

export interface Member {
  fullName: string | null;
  role: OrgRole;
  userId: string;
}

export const useMembers = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async (): Promise<Member[]> => {
      const rows =
        unwrap(
          await supabase
            .from("organization_members")
            .select("user_id, role")
            .eq("organization_id", organizationId)
            .order("created_at")
        ) ?? [];
      const ids = rows.map((row) => row.user_id);
      const profiles = ids.length
        ? (unwrap(
            await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", ids)
          ) ?? [])
        : [];
      const names = new Map(
        profiles.map((profile) => [profile.id, profile.full_name])
      );
      return rows.map((row) => ({
        fullName: names.get(row.user_id) ?? null,
        role: row.role,
        userId: row.user_id,
      }));
    },
    queryKey: queryKeys.organizationMembers(organizationId),
  });
};

/** Owners and admins only (RLS returns nothing to members). */
export const useOrganizationInvitations = (
  organizationId: string,
  enabled: boolean
) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("invitations")
          .select("id, invitee, role, token, expires_at")
          .eq("organization_id", organizationId)
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
      ),
    queryKey: queryKeys.organizationInvitations(organizationId),
  });
};

export const useInvite = (organizationId: string) => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invitee,
      role,
    }: {
      invitee: string;
      role: Exclude<OrgRole, "owner">;
    }) =>
      unwrap(
        await supabase
          .from("invitations")
          .insert({
            invited_by: requireUserId(user?.id),
            invitee,
            organization_id: organizationId,
            role,
          })
          .select("token")
          .single()
      ),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationInvitations(organizationId),
      }),
  });
};

export const useRevokeInvitation = (organizationId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      unwrap(
        await supabase.from("invitations").delete().eq("id", invitationId)
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationInvitations(organizationId),
      }),
  });
};

const useRefreshMembers = (organizationId: string) => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationMembers(organizationId),
      }),
      queryClient.invalidateQueries({ queryKey: ["my-organizations"] }),
    ]);
};

export const useChangeRole = (organizationId: string) => {
  const { supabase } = useAuth();
  const refresh = useRefreshMembers(organizationId);
  return useMutation({
    mutationFn: async ({ role, userId }: { role: OrgRole; userId: string }) => {
      const rows = unwrap(
        await supabase
          .from("organization_members")
          .update({ role })
          .eq("organization_id", organizationId)
          .eq("user_id", userId)
          .select("user_id")
      );
      if (!rows?.length) {
        throw new Error("Role not changed");
      }
    },
    onSettled: refresh,
  });
};

/** Removes a member, or leaves when it is the signed-in user. */
export const useRemoveMember = (organizationId: string) => {
  const { supabase } = useAuth();
  const refresh = useRefreshMembers(organizationId);
  return useMutation({
    mutationFn: async (userId: string) => {
      const rows = unwrap(
        await supabase
          .from("organization_members")
          .delete()
          .eq("organization_id", organizationId)
          .eq("user_id", userId)
          .select("user_id")
      );
      if (!rows?.length) {
        throw new Error("Member not removed");
      }
    },
    onSettled: refresh,
  });
};
