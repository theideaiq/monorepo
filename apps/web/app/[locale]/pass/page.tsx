import { localePath } from "@repo/internationalization";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { PassCard } from "@/components/pass/pass-card";
import { Home } from "@/components/screens/home";
import { getPassSession } from "@/lib/pass/session";

/** Your Pass: the membership card, then orders, Plus and events at a glance. */
const MyPassPage = async () => {
  const [locale, session] = await Promise.all([getLocale(), getPassSession()]);

  if (!session) {
    redirect(
      `${localePath(locale, "/sign-in")}?${new URLSearchParams({ return_to: localePath(locale, "/pass") })}`
    );
  }

  return <Home card={<PassCard session={session} />} />;
};

export default MyPassPage;
