"use server";

import { createClient } from "@repo/auth/server";
import { redirect } from "@repo/internationalization/navigation";
import { getLocale } from "next-intl/server";

/** Signs the staff member out on this device and returns to sign-in. */
export const signOut = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect({ href: "/sign-in", locale: await getLocale() });
};
