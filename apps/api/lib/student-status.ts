import type { Database } from "@repo/database";
import { buckets, removeFolder } from "@repo/storage";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

/** Removes a bare Pass: its card photos, avatar and the auth user. */
const deleteBarePass = async (admin: Client, userId: string) => {
  await removeFolder(admin, buckets.studentCards.id, userId);
  await removeFolder(admin, buckets.avatars.id, userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw error;
  }
};

/**
 * Deletes the caller's student status from /verify
 * (`forget_student_status()`, run as the caller): the badge goes, a card
 * waiting for review is withdrawn and its photo deleted. A bare Pass (made
 * by the student check, holding nothing else) is deleted with it.
 */
export const forgetStudentStatus = async (
  { admin, user }: { admin: Client; user: Client },
  userId: string
): Promise<{ passDeleted: boolean }> => {
  const { data: bare, error } = await user.rpc("forget_student_status");
  if (error) {
    throw error;
  }
  if (bare) {
    await deleteBarePass(admin, userId);
    return { passDeleted: true };
  }
  await removeFolder(admin, buckets.studentCards.id, userId);
  return { passDeleted: false };
};

/**
 * The daily sweep (`sweep_student_checks()`): checks older than 30 days are
 * forgotten, and bare Passes that hold nothing any more are deleted.
 */
export const sweepStudentChecks = async (admin: Client) => {
  const { data: ids, error } = await admin.rpc("sweep_student_checks");
  if (error) {
    throw error;
  }
  let deleted = 0;
  for (const id of ids ?? []) {
    // biome-ignore lint/performance/noAwaitInLoops: a few a day, one at a time
    await deleteBarePass(admin, id);
    deleted += 1;
  }
  return deleted;
};
