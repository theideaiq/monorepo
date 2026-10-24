import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthPage } from "@/components/auth-page";
import type { SearchParams } from "@/lib/return-to";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.signIn");
  return { title: t("title") };
};

interface SignInPageProps {
  readonly searchParams: SearchParams;
}

const SignInPage = ({ searchParams }: SignInPageProps) => (
  <AuthPage mode="sign-in" searchParams={searchParams} />
);

export default SignInPage;
