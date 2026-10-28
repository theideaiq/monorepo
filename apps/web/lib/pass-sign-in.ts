/**
 * Sign in with The IDEA Pass: the website's side of the OpenID Connect
 * authorization request (/oauth/authorize). The partner's return address
 * is checked against its registration before anything is sent to it.
 */

export const PASS_SCOPES = [
  "profile",
  "email",
  "membership",
  "student",
  "student_email",
  "adult",
  "plus",
  "phone",
  "birthdate",
  "address",
  "organizations",
  "card",
  "offline_access",
] as const;

/** Scopes staff turn on for a partner only when it needs them; marked on the consent screen. */
export const SENSITIVE_SCOPES: readonly PassScope[] = [
  "student_email",
  "phone",
  "birthdate",
  "address",
  "organizations",
  "offline_access",
];

export type PassScope = (typeof PASS_SCOPES)[number];

export interface AuthorizeRequest {
  clientId: string;
  codeChallenge: string;
  nonce: string | null;
  /** OIDC `prompt`: "consent" always asks, "none" never shows a page. */
  prompt: "consent" | "none" | null;
  redirectUri: string;
  scopes: string[];
  state: string | null;
  uiLocale: "ar" | "en" | null;
}

export type AuthorizeProblem =
  | "invalid_request"
  | "invalid_scope"
  | "unsupported_response_type";

const CHALLENGE = /^[A-Za-z0-9_-]{43,128}$/;
const SPACES = /\s+/;

/** Reads the request; `problem` is what to send back once the address is known good. */
export const parseAuthorizeRequest = (
  params: URLSearchParams
): { problem: AuthorizeProblem | null; request: AuthorizeRequest } | null => {
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  if (!(clientId && redirectUri)) {
    return null;
  }
  const scopes = [
    ...new Set((params.get("scope") ?? "").split(SPACES).filter(Boolean)),
  ];
  const locale = params.get("ui_locales")?.split(SPACES)[0]?.slice(0, 2);
  const prompts = (params.get("prompt") ?? "").split(SPACES);
  let prompt: AuthorizeRequest["prompt"] = null;
  if (prompts.includes("consent") || prompts.includes("login")) {
    prompt = "consent";
  } else if (prompts.includes("none")) {
    prompt = "none";
  }
  const request: AuthorizeRequest = {
    clientId,
    codeChallenge: params.get("code_challenge") ?? "",
    nonce: params.get("nonce"),
    prompt,
    redirectUri,
    scopes,
    state: params.get("state"),
    uiLocale: locale === "ar" || locale === "en" ? locale : null,
  };

  let problem: AuthorizeProblem | null = null;
  if (params.get("response_type") !== "code") {
    problem = "unsupported_response_type";
  } else if (
    !scopes.includes("openid") ||
    scopes.some(
      (scope) =>
        scope !== "openid" &&
        !(PASS_SCOPES as readonly string[]).includes(scope)
    )
  ) {
    problem = "invalid_scope";
  } else if (
    params.get("code_challenge_method") !== "S256" ||
    !CHALLENGE.test(request.codeChallenge) ||
    (request.nonce?.length ?? 0) > 200
  ) {
    problem = "invalid_request";
  }
  return { problem, request };
};

/** What the partner asks besides signing in, in a fixed order. */
export const askedFor = (scopes: readonly string[]) =>
  PASS_SCOPES.filter((scope) => scopes.includes(scope));

/**
 * What to share without asking again: when the member already shared
 * everything this site asks for, the scopes to send (signing in included);
 * otherwise null and the consent screen shows. `prompt=consent` always
 * asks.
 */
export const rememberedScopes = (
  request: Pick<AuthorizeRequest, "prompt" | "scopes">,
  shared: readonly string[] | null | undefined
) => {
  if (!shared || request.prompt === "consent") {
    return null;
  }
  const asked = askedFor(request.scopes);
  return asked.every((scope) => shared.includes(scope))
    ? ["openid", ...asked]
    : null;
};

/** The partner's return address with the code, or with an error. */
export const returnUrl = (
  request: Pick<AuthorizeRequest, "redirectUri" | "state">,
  issuer: string,
  result: { code: string } | { error: string }
) => {
  const url = new URL(request.redirectUri);
  if ("code" in result) {
    url.searchParams.set("code", result.code);
  } else {
    url.searchParams.set("error", result.error);
  }
  if (request.state) {
    url.searchParams.set("state", request.state);
  }
  url.searchParams.set("iss", issuer);
  return url.toString();
};
