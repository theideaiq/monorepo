import { localePath } from "@repo/internationalization";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { hostOf, readReturnTo, type SearchParams } from "@/lib/pass/return-to";
import { getPassSession } from "@/lib/pass/session";
import { PassSignIn } from "./pass-sign-in";
import { TelegramButton } from "./telegram-button";

interface AuthPageProps {
  readonly searchParams: SearchParams;
}

/**
 * The sign-in page, which also gives new visitors their Pass; signed-in
 * visitors go straight on.
 */
export const AuthPage = async ({ searchParams }: AuthPageProps) => {
  const locale = await getLocale();
  const [returnTo, session, params] = await Promise.all([
    readReturnTo(searchParams, locale),
    getPassSession(),
    searchParams,
  ]);

  if (session) {
    redirect(returnTo ?? localePath(locale, "/pass"));
  }

  const t = await getTranslations("pass");
  const host = hostOf(returnTo);
  // Set by the app after an account is deleted.
  const deleted = params.notice === "deleted";

  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">
          {t("signIn.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("signIn.description")}
        </p>
        {host ? (
          <p className="text-muted-foreground text-xs">
            {t("continueTo", { host })}
          </p>
        ) : null}
      </div>
      {deleted ? (
        <p
          className="rounded-md bg-muted p-3 text-center text-sm"
          role="status"
        >
          {t("signIn.deleted")}
        </p>
      ) : null}
      <PassSignIn returnTo={returnTo} />
      <TelegramButton returnTo={returnTo} />
    </div>
  );
};
