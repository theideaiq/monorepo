"use server";

import { createClient } from "@repo/auth/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { passLink } from "./pass";

/**
 * Signs the staff member out on this device (the shared cookie, so every
 * site of The IDEA) and opens The IDEA Pass sign-in, which comes back here.
 */
export const signOut = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect(passLink("/sign-in", await getLocale()));
};
