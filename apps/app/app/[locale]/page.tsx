import { passUrl } from "@repo/auth/pass";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { env } from "@/env";
import { getPassSession } from "@/lib/pass/session";

/**
 * The IDEA Spark's front door: staff go to the back office, everyone else
 * to their business (The IDEA Suite); signed-out visitors sign in with The
 * IDEA Pass on the website first.
 */
const SparkHome = async () => {
  const [locale, session] = await Promise.all([getLocale(), getPassSession()]);

  if (!session) {
    redirect(
      passUrl("/sign-in", `${env.NEXT_PUBLIC_APP_URL}/${locale}`, locale)
    );
  }

  const { data: staff } = await session.supabase
    .from("staff")
    .select("role")
    .eq("user_id", session.user.id)
    .maybeSingle();

  redirect(staff ? `/${locale}/admin` : `/${locale}/business`);
};

export default SparkHome;
