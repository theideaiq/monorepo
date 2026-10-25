import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { PassCard } from "@/components/pass/pass-card";
import { Home } from "@/components/screens/home";
import { getPassSession } from "@/lib/pass/session";

/** My Pass: the membership card, then orders, Plus and events at a glance. */
const MyPassPage = async () => {
  const [locale, session] = await Promise.all([getLocale(), getPassSession()]);

  if (!session) {
    redirect(
      `/${locale}/sign-in?${new URLSearchParams({ return_to: `/${locale}/pass` })}`
    );
  }

  return <Home card={<PassCard session={session} />} />;
};

export default MyPassPage;
