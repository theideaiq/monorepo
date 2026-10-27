"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Link,
  usePathname,
  useRouter,
} from "@repo/internationalization/navigation";
import { CheckIcon, ShieldCheckIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  type AuthorizeRequest,
  askedFor,
  parseAuthorizeRequest,
  returnUrl,
  SENSITIVE_SCOPES,
} from "@/lib/pass-sign-in";
import {
  useApprovePassSignIn,
  usePassPartner,
} from "@/lib/pass-sign-in-queries";
import { useStudentProfile } from "@/lib/survey-queries";

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/** Nothing can be sent back: the site or its return address is unknown. */
const UnknownSite = () => {
  const t = useTranslations("pass.authorize");
  return (
    <div className="grid gap-3 text-center">
      <h1 className="font-semibold text-lg">{t("unknownTitle")}</h1>
      <p className="text-muted-foreground text-sm">{t("unknown")}</p>
      <Link className="text-pink-text text-sm underline" href="/">
        {t("home")}
      </Link>
    </div>
  );
};

/** The consent screen for a known partner and return address. */
const Consent = ({
  issuer,
  partner,
  request,
}: {
  readonly issuer: string;
  readonly partner: { name: string; website: string };
  readonly request: AuthorizeRequest;
}) => {
  const t = useTranslations("pass.authorize");
  const approve = useApprovePassSignIn();
  const profile = useStudentProfile();
  const universityEmail = profile.data?.university_email;
  const [leaving, setLeaving] = useState(false);
  const asked = askedFor(request.scopes);
  // Everything asked is shared unless the person unticks it; signing in
  // itself (openid) always is.
  const [chosen, setChosen] = useState<string[]>(asked);
  const toggle = (scope: string, on: boolean) =>
    setChosen((current) =>
      on ? [...current, scope] : current.filter((item) => item !== scope)
    );

  const leave = (result: { code: string } | { error: string }) => {
    setLeaving(true);
    window.location.assign(returnUrl(request, issuer, result));
  };
  const allow = () =>
    approve.mutate(
      {
        clientId: request.clientId,
        codeChallenge: request.codeChallenge,
        nonce: request.nonce,
        redirectUri: request.redirectUri,
        scopes: ["openid", ...asked.filter((scope) => chosen.includes(scope))],
      },
      { onSuccess: (code) => (code ? leave({ code }) : undefined) }
    );

  return (
    <div className="grid gap-5">
      <div className="grid gap-2 text-center">
        <ShieldCheckIcon
          aria-hidden="true"
          className="mx-auto size-8 text-pink-text"
        />
        <h1 className="font-semibold text-lg">
          {t("title", { site: partner.name })}
        </h1>
        <p className="text-muted-foreground text-sm" dir="ltr">
          {hostOf(partner.website)}
        </p>
      </div>
      <div className="grid gap-2">
        <p className="font-medium text-sm">{t("shares")}</p>
        <ul className="grid gap-2 text-sm">
          <li className="flex gap-2">
            <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t("scopes.openid")}
          </li>
          {asked.map((scope) => (
            <li key={scope}>
              <label className="flex items-start gap-2">
                <input
                  checked={chosen.includes(scope)}
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                  onChange={(event) => toggle(scope, event.target.checked)}
                  type="checkbox"
                />
                <span>
                  {t(`scopes.${scope}`)}
                  {SENSITIVE_SCOPES.includes(scope) ? (
                    <span className="ms-2 rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
                      {t("sensitive")}
                    </span>
                  ) : null}
                  {scope === "student_email" && !universityEmail ? (
                    <span className="block text-muted-foreground text-xs">
                      {t("noStudentEmail")}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">
          {t("never")}{" "}
          <Link className="underline" href="/pass/settings#sites">
            {t("manage")}
          </Link>
        </p>
      </div>
      <div className="grid gap-2">
        <Button disabled={approve.isPending || leaving} onClick={allow}>
          {t("allow")}
        </Button>
        <Button
          disabled={approve.isPending || leaving}
          onClick={() => leave({ error: "access_denied" })}
          variant="ghost"
        >
          {t("deny")}
        </Button>
      </div>
      {approve.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};

/**
 * /oauth/authorize: a partner site asks to sign the member in with their
 * Pass. The member sees who's asking and what they'd share, each time.
 */
export const PassConsent = ({ issuer }: { readonly issuer: string }) => {
  const params = useSearchParams();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const parsed = parseAuthorizeRequest(new URLSearchParams(params.toString()));
  const partner = usePassPartner(parsed?.request.clientId ?? "");
  const wanted = parsed?.request.uiLocale;

  // The partner's language, when it asks for one.
  useEffect(() => {
    if (wanted && wanted !== locale) {
      router.replace(`${pathname}?${params.toString()}`, { locale: wanted });
    }
  }, [locale, params, pathname, router, wanted]);

  if (!parsed) {
    return <UnknownSite />;
  }
  if (partner.isPending) {
    return <SectionSpinner />;
  }
  if (partner.isError) {
    return <ErrorState onRetry={() => partner.refetch()} />;
  }
  const site = partner.data;
  const { problem, request } = parsed;
  if (!site?.redirect_uris.includes(request.redirectUri)) {
    return <UnknownSite />;
  }
  const notAllowed = request.scopes.some(
    (scope) => scope !== "openid" && !site.answers.includes(scope)
  );
  if (problem || notAllowed) {
    return (
      <SendBack
        error={problem ?? "invalid_scope"}
        issuer={issuer}
        request={request}
      />
    );
  }
  return <Consent issuer={issuer} partner={site} request={request} />;
};

/** A bad request from a known site goes back to it with the error. */
const SendBack = ({
  error,
  issuer,
  request,
}: {
  readonly error: string;
  readonly issuer: string;
  readonly request: AuthorizeRequest;
}) => {
  useEffect(() => {
    window.location.replace(returnUrl(request, issuer, { error }));
  }, [error, issuer, request]);
  return <SectionSpinner />;
};
