import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

interface PassLayoutProperties {
  readonly children: ReactNode;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.meta");
  return {
    description: t("description"),
    // Sign-in pages: never indexed.
    robots: { follow: false, index: false },
  };
};

/**
 * The IDEA Pass sign-in and authenticator-app pages, in one centred card
 * under the site header. The session cookie they set is shared with The
 * IDEA Partners and Staff.
 */
const PassLayout = ({ children }: PassLayoutProperties) => (
  <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-surface p-4">
    <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      {children}
    </div>
  </main>
);

export default PassLayout;
