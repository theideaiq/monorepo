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
} from "@/lib/pass-sign-in";
import {
  useApprovePassSignIn,
  usePassPartner,
} from "@/lib/pass-sign-in-queries";

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
  const [leaving, setLeaving] = useState(false);
  const asked = askedFor(request.scopes);

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
        scopes: request.scopes,
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
            <li className="flex gap-2" key={scope}>
              <CheckIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              {t(`scopes.${scope}`)}
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
