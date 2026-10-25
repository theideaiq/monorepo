import "server-only";

import { createAdminClient } from "@repo/database/admin";

/**
 * The member a linked Telegram account (by Telegram user id) belongs to, as a one-time sign-in
 * token for the website (`verifyOtp` with the token hash), or why not.
 */
export const signInToken = async (telegramId: number) => {
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("telegram_members")
    .select("user_id")
    .eq("id", telegramId)
    .maybeSingle();
  if (!member?.user_id) {
    return null;
  }
  const [{ data: user }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(member.user_id),
    admin
      .from("profiles")
      .select("banned_at")
      .eq("id", member.user_id)
      .maybeSingle(),
  ]);
  const email = user.user?.email;
  if (profile?.banned_at) {
    return { error: "suspended" } as const;
  }
  if (!email) {
    return null;
  }
  const { data, error } = await admin.auth.admin.generateLink({
    email,
    type: "magiclink",
  });
  if (error || !data.properties?.hashed_token) {
    throw error ?? new Error("No sign-in token");
  }
  return { tokenHash: data.properties.hashed_token } as const;
};
