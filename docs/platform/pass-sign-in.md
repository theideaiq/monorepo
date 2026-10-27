# Sign in with The IDEA Pass (for partner sites)

Partner sites (the first is auibsal.org) can let people sign in with their
The IDEA Pass. It's standard OpenID Connect (authorization code with PKCE),
run by The IDEA's API. People see who's asking and what would be shared
every time, and can disconnect a site in Pass → Settings → Connected sites.

## Getting a client

**Companies register their own apps** in The IDEA Business → Developers
(owners and admins):

1. **Verify a domain.** Add it, then publish the token we show, either as
   a DNS TXT record `_theidea-pass.<domain>` with the value
   `theidea-pass-verification=<token>`, or as a file at
   `https://<domain>/.well-known/theidea-pass-verification.txt` holding the
   token. "Check now" asks the API (`POST /pass/domains/verify`), which
   looks for the record, then the file (no redirects, 5 seconds, at most
   every 10 seconds). theideaiq.com and shared hosting domains can't be
   used; a domain an app still uses can't be removed.
2. **Register the app:** its name (shown on the consent screen), website
   and exact return addresses. The website and every https return address
   must be on a verified domain (or under it); `http://localhost:<port>/…`
   is allowed for development. The page shows the **client id** (`pass_…`)
   and **client secret** once; only its hash is kept.
3. **Test it.** A new app is in testing: only the company's own members
   can sign in (and only their cards pass card checks), and it can ask for
   every answer it registered.
4. **Go live.** Everyone can sign in. The basic answers work at once; the
   sensitive ones (`student_email`, `phone`, `birthdate`, `address`,
   `offline_access`) wait for staff review and aren't asked until approved.
   Asking for a new sensitive answer later goes back to review; approved
   ones keep working. Withdrawing an approval also stops it for earlier
   grants and refresh tokens.

Companies can rotate the secret (the previous one keeps working 24 hours,
or stops at once if they choose), stop the previous secret early, upload
public keys for `private_key_jwt` instead, turn the app off, and see the
people connected and the last 30 days' sign-ins and card checks. Up to 10
domains and 10 apps per company.

**Staff** see every app in the back office (Companies → Sign in with the
Pass), approve or decline the sensitive answers (the company's owners and
admins are notified, with the note), and can suspend any app. Apps waiting
for review show in the inbox. Staff can still register an app for a
partner themselves: what staff set is approved, and it's live at once.

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
- The token endpoint takes `client_secret_basic` (default),
  `client_secret_post` or `private_key_jwt`, with
  `grant_type=authorization_code` or `refresh_token`. A code
  lasts 5 minutes and works once (a failed attempt uses it up).
- The response has an `id_token` (1 hour), an `access_token` (1 hour, for
  userinfo and the card), `scope` and, with `offline_access`, a
  `refresh_token`.
- The return address gets `code`, `state` and `iss`, or `error`
  (`access_denied` when the person says no, `invalid_scope`,
  `invalid_request`). An unknown client or return address is never sent
  anything.

### `private_key_jwt`

With public keys uploaded (a JWK set of up to 5 EC P-256 or RSA 2048+
keys), the partner's server signs a client assertion instead of sending
the secret: `client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer`
and `client_assertion=<JWT>`, the JWT signed with ES256 or RS256, `iss`
and `sub` the client id, `aud` the issuer or the endpoint
(`…/oidc/token`, `…/oidc/card/check`), at most 5 minutes from `iat` to
`exp`, and a fresh `jti` each time (each is accepted once). The card check
accepts the same fields in its JSON body.

## Scopes and claims

`openid` is required. A site can ask only for the scopes it registered
(and, when live, that are approved), and the person can untick any
of them on the consent screen: the token response's `scope` lists what
was actually shared, and claims for anything else are simply absent.
Sensitive scopes are marked on the consent screen and off by default.

| Scope | Claims | |
| --- | --- | --- |
| `openid` | `sub`: the person's id **at this site** (each site gets its own) | |
| `profile` | `name`, `given_name`, `family_name`, `locale` (`ar` or `en`), `picture` | |
| `email` | `email`, `email_verified` (the Pass email) | |
| `membership` | `member_number`, `member_since` | |
| `student` | `student`: `{ "verified": true, "university": "auib", "until": "2027-06-30" }`, or `{ "verified": false }` | |
| `student_email` | `student_email`, `student_email_verified`: the university email the badge was verified with (absent for card-photo badges, or until the student confirms it in Settings) | sensitive |
| `adult` | `adult`: `true` when 18 or over | |
| `plus` | `plus`, and `plus_plan` (the plan's name) for members | |
| `phone` | `phone_number` (the WhatsApp number from Settings, `+9647…`), `phone_number_verified: false` | sensitive |
| `birthdate` | `birthdate` (`YYYY-MM-DD`) | sensitive |
| `address` | `address` (OpenID Connect address: `formatted`, `street_address`, `locality`, `region`, `country`), from the latest delivery | sensitive |
| `card` | No claim: lets the access token fetch the person's card (below) | |
| `offline_access` | No claim: the token response adds a `refresh_token` | sensitive |

The ID token has the claims as they were at sign-in; userinfo works them
out again (a badge that ended reads `verified: false`). Nothing is shared
that the person didn't tick, and never orders or payments.

**Refresh tokens** (`offline_access`): `grant_type=refresh_token` with the
client secret returns a new access token, ID token and refresh token. Each
refresh token works once (use the new one each time) and lasts 90 days;
disconnecting the site in Settings ends them.

Universities use the ids in Customers → Students (`auib`, `uobaghdad`,
`mustansiriyah`, `uotechnology`, `nahrain`, `aliraqia`, `mansour`,
`dijlah`, `rafidain`).

## Showing the person's Pass card (`card` scope)

`GET https://api.theideaiq.com/oidc/card` with `Authorization: Bearer
<access token>` returns the card as an SVG image (`?lang=ar` for Arabic):
the brand's card with the name, member number, The IDEA Plus plan, the
Student badge and "member since", drawn **without** the scannable code (a
copy on a website must never pass a door check). Send
`Accept: application/json` for the same details as JSON. Fetch it from
your server while the access token is valid (1 hour) and serve or cache
it yourself; the person can always open the live card at
https://theideaiq.com/pass (or in Google Wallet).

## Checking a Pass card's QR code (door checks)

The live card's QR code reads `IDEA:<member number>:<6 digits>`; the
digits change every 30 seconds. A partner's app sends what it scanned:

```
POST https://api.theideaiq.com/oidc/card/check
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/json

{ "code": "IDEA:100007:123456" }
```

The answer is `{ "valid": false }`, or:

```json
{
  "valid": true,
  "sub": "…",
  "given_name": "Sara",
  "member_number": 100007,
  "student": { "verified": true, "university": "auib", "until": "2027-06-30" },
  "adult": true
}
```

- `sub` is the same id as in the partner's ID tokens, or `null` if the
  person never signed in there. Match it to your member.
- `given_name` and `member_number` are printed on the card, so the person
  at the door can compare. The yes/no answers are the ones the partner is
  registered for.
- Showing the card is the person's consent to the check. Every check is
  listed in their Pass → Settings.
- 30 failed checks in 10 minutes pause the partner's checks for a while
  (HTTP 429). The client secret stays on the partner's server; an app
  calls the partner's own backend, which calls this endpoint.

## Turning it on (owner)

1. Generate the signing key: `bun run --cwd apps/api oidc:key`, and set
   the output as `PASS_OIDC_SIGNING_KEY` on the API project (Vercel →
   theideaiq-api → Settings → Environment Variables, Production). Until
   then the `/oidc` endpoints answer 503.
2. Partners register themselves (above); staff review the sensitive
   answers they ask for.

Rotating the key: set a new `PASS_OIDC_SIGNING_KEY`; ID tokens issued
before stop verifying (they last an hour anyway).

## Why not Supabase Auth's OAuth server

Supabase Auth has an OAuth 2.1 server (beta). We tested it on 27 Oct 2026:
its access tokens act as the person's own session on Supabase Auth, so a
partner holding one could set a password on the person's Pass and sign in
as them, change their email or add an authenticator. The database could be
locked off with a token hook, Supabase Auth itself could not. The
provider here issues tokens Supabase never accepts.
