# Sign in with The IDEA Pass (for partner sites)

Partner sites (the first is auibsal.org) can let people sign in with their
The IDEA Pass. It's standard OpenID Connect (authorization code with PKCE),
run by The IDEA's API. People see who's asking and what would be shared
every time, and can disconnect a site in Pass → Settings → Connected sites.

## Getting a client

Staff register the site in the back office: Companies → Sign in with the
Pass → Add a partner site. That needs:

- the site's name (shown on the consent screen) and website;
- its exact return addresses (https; `http://localhost:<port>/…` for
  development), for example `https://auibsal.org/auth/pass` and
  `https://auibsal.org/ar/auth/pass`;
- what it may ask (see Scopes).

The page shows the **client id** (`pass_…`) and **client secret** once.
Send the secret to the partner's developers privately; they keep it on
their server (never in a browser or an app). "New secret" replaces it at
once.

## Endpoints

Discovery: `https://api.theideaiq.com/oidc/.well-known/openid-configuration`

| | |
| --- | --- |
| Issuer | `https://api.theideaiq.com/oidc` |
| Authorization | `https://theideaiq.com/oauth/authorize` |
| Token | `https://api.theideaiq.com/oidc/token` |
| Userinfo | `https://api.theideaiq.com/oidc/userinfo` |
| Keys (JWKS) | `https://api.theideaiq.com/oidc/jwks` (ES256) |

- `response_type=code`, PKCE `S256` required, `state` and `nonce`
  recommended, `ui_locales=ar` or `en` picks the consent screen's language.
- The token endpoint takes `client_secret_basic` (default) or
  `client_secret_post`, and `grant_type=authorization_code` only. A code
  lasts 5 minutes and works once (a failed attempt uses it up).
- The response has an `id_token` (1 hour), an `access_token` (1 hour, for
  userinfo only) and `scope`. There are no refresh tokens: the partner
  keeps its own session after sign-in.
- The return address gets `code`, `state` and `iss`, or `error`
  (`access_denied` when the person says no, `invalid_scope`,
  `invalid_request`). An unknown client or return address is never sent
  anything.

## Scopes and claims

`openid` is required. The others are only those the site was registered for.

| Scope | Claims |
| --- | --- |
| `openid` | `sub`: the person's id **at this site** (each site gets its own) |
| `profile` | `name`, `given_name`, `family_name`, `locale` (`ar` or `en`) |
| `email` | `email`, `email_verified` |
| `student` | `student`: `{ "verified": true, "university": "auib", "until": "2027-06-30" }`, or `{ "verified": false }` |
| `adult` | `adult`: `true` when 18 or over |
| `plus` | `plus`: `true` with an active The IDEA Plus membership |

The ID token has the claims as they were at sign-in; userinfo works them
out again (a badge that ended reads `verified: false`). Nothing else is
ever shared: no birthday, phone, address, university email or orders.

Universities use the ids in Customers → Students (`auib`, `uobaghdad`,
`mustansiriyah`, `uotechnology`, `nahrain`, `aliraqia`, `mansour`,
`dijlah`, `rafidain`).

## Turning it on (owner)

1. Generate the signing key: `bun run --cwd apps/api oidc:key`, and set
   the output as `PASS_OIDC_SIGNING_KEY` on the API project (Vercel →
   theideaiq-api → Settings → Environment Variables, Production). Until
   then the `/oidc` endpoints answer 503.
2. Register the partner (above) and send its developers the client id,
   secret and discovery address.

Rotating the key: set a new `PASS_OIDC_SIGNING_KEY`; ID tokens issued
before stop verifying (they last an hour anyway).

## Why not Supabase Auth's OAuth server

Supabase Auth has an OAuth 2.1 server (beta). We tested it on 27 Oct 2026:
its access tokens act as the person's own session on Supabase Auth, so a
partner holding one could set a password on the person's Pass and sign in
as them, change their email or add an authenticator. The database could be
locked off with a token hook, Supabase Auth itself could not. The
provider here issues tokens Supabase never accepts.
