import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

interface AdminLayoutProperties {
  readonly children: ReactNode;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.meta");
  return {
    description: t("description"),
    // Staff only: never indexed (robots.txt and X-Robots-Tag say the same).
    robots: { follow: false, index: false },
    title: { default: t("title"), template: `%s · ${t("title")}` },
  };
};

/**
 * The back office (`/{locale}/staff`), for staff at AAL2: its client
 * components get the back-office texts. It loads no analytics.
 */
const AdminLayout = async ({ children }: AdminLayoutProperties) => {
  const { admin, auth, common, store } = await getMessages();

  return (
    <NextIntlClientProvider messages={{ admin, auth, common, store }}>
      {children}
    </NextIntlClientProvider>
  );
};

export default AdminLayout;
