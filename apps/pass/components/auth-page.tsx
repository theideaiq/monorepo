import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { hostOf, readReturnTo, type SearchParams } from "@/lib/return-to";
import { getPassSession } from "@/lib/session";
import { PassSignIn } from "./pass-sign-in";

interface AuthPageProps {
  readonly mode: "sign-in" | "sign-up";
  readonly searchParams: SearchParams;
}

/** The sign-in and sign-up pages; signed-in visitors go straight on. */
export const AuthPage = async ({ mode, searchParams }: AuthPageProps) => {
  const [locale, returnTo, session, params] = await Promise.all([
    getLocale(),
    readReturnTo(searchParams),
    getPassSession(),
    searchParams,
  ]);

  if (session) {
    redirect(returnTo ?? `/${locale}`);
  }

  const t = await getTranslations("pass");
  const key = mode === "sign-up" ? "signUp" : "signIn";
  const host = hostOf(returnTo);
  // Set by the app after an account is deleted.
  const deleted = mode === "sign-in" && params.notice === "deleted";

  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">
          {t(`${key}.title`)}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t(`${key}.description`)}
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
      <PassSignIn mode={mode} returnTo={returnTo} />
    </div>
  );
};
