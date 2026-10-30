import { keys as analytics } from "@repo/analytics/conversions/keys";
import { keys as auth } from "@repo/auth/keys";
import { keys as database } from "@repo/database/keys";
import { keys as droid } from "@repo/droid/keys";
import { keys as email } from "@repo/email/keys";
import { envPresets, withPresets } from "@repo/next-config/env";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { keys as status } from "@repo/observability/status/keys";
import { keys as payments } from "@repo/payments/keys";
import { keys as rateLimit } from "@repo/rate-limit/keys";
import { keys as security } from "@repo/security/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import { keys as boxy } from "./lib/boxy/keys";
import { keys as lookup } from "./lib/lookup/keys";
import { keys as oidc } from "./lib/oidc/keys";
import { keys as appleWallet } from "./lib/pass/apple-wallet-keys";
import { keys as phoneVerify } from "./lib/phone-verify/keys";
import { keys as reloadly } from "./lib/reloadly/keys";
import { keys as whatsapp } from "./lib/whatsapp/keys";

const presets = envPresets(
  auth(),
  analytics(),
  appleWallet(),
  boxy(),
  core(),
  database(),
  droid(),
  email(),
  lookup(),
  observability(),
  oidc(),
  payments(),
  phoneVerify(),
  rateLimit(),
  reloadly(),
  security(),
  status(),
  whatsapp()
);

export const env = withPresets(
  createEnv({
    client: {},
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    extends: presets,
    runtimeEnv: {
      CRON_SECRET: process.env.CRON_SECRET,
      DOCS_URL: process.env.DOCS_URL,
      FCM_SERVICE_ACCOUNT: process.env.FCM_SERVICE_ACCOUNT,
      GOOGLE_WALLET_ISSUER_ID: process.env.GOOGLE_WALLET_ISSUER_ID,
      GOOGLE_WALLET_SERVICE_ACCOUNT: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT,
      PUSH_WEBHOOK_SECRET: process.env.PUSH_WEBHOOK_SECRET,
      STORE_NOTIFICATIONS_EMAIL: process.env.STORE_NOTIFICATIONS_EMAIL,
      TELEGRAM_LOGIN_CLIENT_ID: process.env.TELEGRAM_LOGIN_CLIENT_ID,
      TELEGRAM_LOGIN_CLIENT_SECRET: process.env.TELEGRAM_LOGIN_CLIENT_SECRET,
    },
    server: {
      // Shared secret Vercel Cron sends as a Bearer token. Generate with
      // `openssl rand -hex 32`. Cron routes reject every request when unset.
      CRON_SECRET: z.string().min(32).optional(),
      // The developer docs (apps/docs) on Mintlify, served at this site's
      // root by rewrite (https://<subdomain>.mintlify.site). "/" is a 404
      // while unset.
      DOCS_URL: z.url().optional(),
      // Firebase service account key (the JSON file's contents, or base64
      // of it) for push notifications through FCM HTTP v1. Push is off
      // while unset.
      FCM_SERVICE_ACCOUNT: z.string().min(1).optional(),
      // Google Wallet (Pay & Wallet Console → Google Wallet API): the
      // issuer ID, and the key of a service account added to the issuer
      // (JSON or base64). "Add to Google Wallet" is hidden while unset.
      GOOGLE_WALLET_ISSUER_ID: z.string().regex(/^\d+$/).optional(),
      GOOGLE_WALLET_SERVICE_ACCOUNT: z.string().min(1).optional(),
      // Bearer token the Supabase database webhook on `notifications`
      // inserts sends to POST /webhooks/notifications (`openssl rand -hex 32`).
      PUSH_WEBHOOK_SECRET: z.string().min(32).optional(),
      // Optional inbox that gets an email for every paid store order.
      STORE_NOTIFICATIONS_EMAIL: z.email().optional(),
      // Telegram sign-in (OpenID Connect): the Client ID and Secret from
      // @BotFather → the bot → Login Widget, whose Allowed URLs include
      // <API URL>/auth/telegram/callback. Hidden while unset.
      TELEGRAM_LOGIN_CLIENT_ID: z.string().regex(/^\d+$/).optional(),
      TELEGRAM_LOGIN_CLIENT_SECRET: z.string().min(16).optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  }),
  presets
);
