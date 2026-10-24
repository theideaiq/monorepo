# When something breaks

Where alerts come from, where to look first, and who to tell.

| Signal | Comes from | Look at |
| --- | --- | --- |
| A site is down | Uptime monitors (BetterStack) on the website, the app's sign-in page and the API's `/health` | The Vercel project's latest deployment, then status.supabase.com |
| Errors for customers | Sentry | The issue's stack trace and the release it started in |
| Payments not confirming | Wayl dashboard and the `webhook_events` table | Whether the Wayl webhook reaches `/webhooks/payments` and returns 200 |
| The Telegram bot is silent | Telegram `getWebhookInfo` | `apps/api/scripts/telegram-setup.ts`, the webhook secret |
| Emails not arriving | Resend logs | The sending domain's DNS and the API key |
| A deploy failed | Vercel and the GitHub checks on the pull request | The build log |
| A migration failed | GitHub → Actions → Migrate production database | The failing statement; fix with a new migration |
| A backup failed | GitHub → Actions → Back up production database (and the heartbeat alert) | The run log; usually a missing secret or an expired access token |
| A cron job failed | Vercel → the API project → Cron Jobs | The job's logs (`/cron/rentals`, `/cron/subscriptions`, `/cron/keep-alive`) |

## First steps

1. **Is it everyone or one person?** Try it signed out, then with a test
   account.
2. **Did something just change?** If a deploy went out in the last hour,
   [roll it back](releases.md#if-a-release-breaks-something) first and
   investigate after.
3. **Is it a permission?** Most "can't see it" reports from staff are a
   missing staff role or a session without the authenticator-app step
   (AAL2), not a fault.
4. **Tell people.** Post a short note to the team: what is broken, since
   when, and when you will update next.

## Data incidents

If customer data or payment details may have been exposed, tell the owners
the same day, rotate the affected keys (Supabase secret key, Wayl, Telegram,
Resend), and record what happened, when, and what was done.
