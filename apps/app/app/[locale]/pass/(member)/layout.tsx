import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { RequireOnboarding } from "@/components/gates";
import { OrganizationProvider } from "@/components/organization-provider";
import { PassGate } from "@/components/pass/pass-gate";
import { PassNav } from "@/components/pass-nav";

interface MyPassLayoutProps {
  readonly children: ReactNode;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.home");
  return {
    // Personal pages: never indexed.
    robots: { follow: false, index: false },
    title: { default: t("title"), template: `%s · ${t("title")}` },
  };
};

/**
 * Your Pass: the signed-in customer's own pages (orders, The IDEA Plus,
 * wishlist, events, submissions, support, settings). Requires a
 * session and a finished onboarding, except `/pass` itself, which explains
 * the Pass to visitors who aren't signed in; the data is protected by RLS.
 */
const MyPassLayout = ({ children }: MyPassLayoutProps) => (
  <PassGate>
    <OrganizationProvider>
      <RequireOnboarding>
        <div className="container mx-auto grid gap-6 px-4 py-6 md:grid-cols-[13rem_1fr] md:py-10">
          <aside className="md:sticky md:top-20 md:self-start">
            <PassNav />
          </aside>
          <div className="flex min-w-0 flex-col">{children}</div>
        </div>
      </RequireOnboarding>
    </OrganizationProvider>
  </PassGate>
);

export default MyPassLayout;
