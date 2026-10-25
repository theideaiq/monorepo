import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthPage } from "@/components/pass/auth-page";
import type { SearchParams } from "@/lib/pass/return-to";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.signUp");
  return { title: t("title") };
};

interface SignUpPageProps {
  readonly searchParams: SearchParams;
}

const SignUpPage = ({ searchParams }: SignUpPageProps) => (
  <AuthPage mode="sign-up" searchParams={searchParams} />
);

export default SignUpPage;
