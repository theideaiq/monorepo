import { ShieldXIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { redirect } from "@/lib/admin/navigation";
import { getSession, redirectToPass } from "@/lib/admin/session";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.noAccess");
  return { title: t("title") };
};

/** Signed in, but without a staff role. */
const NoAccessPage = async () => {
  const locale = await getLocale();
  const session = await getSession();

  if (session.status === "signed-out") {
    await redirectToPass("/sign-in");
  }
  if (session.status !== "not-staff") {
    redirect({ href: "/", locale });
  }

  const t = await getTranslations("admin.noAccess");

  return (
    <div className="grid gap-4 text-center">
      <ShieldXIcon className="mx-auto size-10 text-destructive" />
      <h1 className="font-semibold text-2xl tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      <SignOutButton className="w-full" />
    </div>
  );
};

export default NoAccessPage;
