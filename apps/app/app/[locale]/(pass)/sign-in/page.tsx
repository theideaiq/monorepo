import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthPage } from "@/components/pass/auth-page";
import type { SearchParams } from "@/lib/pass/return-to";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.signIn");
  return { title: t("title") };
};

interface SignInPageProps {
  readonly searchParams: SearchParams;
}

const SignInPage = ({ searchParams }: SignInPageProps) => (
  <AuthPage searchParams={searchParams} />
);

export default SignInPage;
