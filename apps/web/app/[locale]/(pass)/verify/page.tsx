import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { StudentCheck } from "@/components/pass/student-check";
import { env } from "@/env";
import { readReturnTo, type SearchParams } from "@/lib/pass/return-to";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.verify");
  return { description: t("description"), title: t("title") };
};

interface VerifyPageProps {
  readonly searchParams: SearchParams;
}

/** "Verify you're a student": the student check, without joining. */
const VerifyPage = async ({ searchParams }: VerifyPageProps) => {
  const locale = await getLocale();
  return (
    <StudentCheck
      returnTo={await readReturnTo(searchParams, locale)}
      turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
    />
  );
};

export default VerifyPage;
