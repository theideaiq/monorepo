"use server";

import { safeReturnTo } from "@repo/auth/pass";
import { createClient } from "@repo/auth/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

/**
 * Signs out on this device (the shared cookie, so every site of The IDEA)
 * and goes to `return_to` when it is allowed, else to the Pass sign-in.
 */
export const signOut = async (formData: FormData) => {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  const raw = formData.get("return_to");
  const target = safeReturnTo(typeof raw === "string" ? raw : null, null);
  redirect(target ?? `/${await getLocale()}/sign-in`);
};
