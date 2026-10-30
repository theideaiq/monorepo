import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { StudentCheck } from "@/components/pass/student-check";
import { env } from "@/env";
import { appLink } from "@/lib/links";
import { readReturnTo, type SearchParams } from "@/lib/pass/return-to";
import { verifyKind } from "@/lib/verify-kinds";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.verify");
  return { description: t("description"), title: t("title") };
};

interface VerifyPageProps {
  readonly searchParams: SearchParams;
}

/**
 * /verify: the student check without joining, and, for a Pass, every
 * verification in one place (`?kind=`).
 */
const VerifyPage = async ({ searchParams }: VerifyPageProps) => {
  const locale = await getLocale();
  const { kind } = await searchParams;
  return (
    <StudentCheck
      kind={verifyKind(typeof kind === "string" ? kind : undefined)}
      partnersUrl={appLink(env.NEXT_PUBLIC_APP_URL, locale, "/organization")}
      returnTo={await readReturnTo(searchParams, locale)}
      turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
    />
  );
};

export default VerifyPage;
