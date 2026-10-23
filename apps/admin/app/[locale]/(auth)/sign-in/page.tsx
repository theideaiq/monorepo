import { redirect } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { SignInForm } from "./sign-in-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.signIn");
  return { title: t("title") };
};

const SignInPage = async () => {
  const locale = await getLocale();
  const session = await getSession();

  if (session.status !== "signed-out") {
    // The console layout sends the user on to MFA or the no-access page.
    redirect({ href: "/", locale });
  }

  const t = await getTranslations("admin.signIn");

  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <SignInForm />
    </div>
  );
};

export default SignInPage;
