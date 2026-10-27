import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    client: {
      // Parent domain for the session cookie, e.g. ".theideaiq.com", so one
      // sign-in on The IDEA Pass carries across every subdomain. Unset
      // locally and on previews (host-only cookie).
      NEXT_PUBLIC_AUTH_COOKIE_DOMAIN: z.string().startsWith(".").optional(),
      // Sign-in providers turned on in Supabase, in button order, e.g.
      // "google,apple,azure,facebook,linkedin_oidc".
      NEXT_PUBLIC_AUTH_PROVIDERS: z.string().optional(),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
        .string()
        .startsWith("sb_publishable_")
        .optional(),
      NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
      // Cloudflare Turnstile's site key for the sign-in forms (public; the
      // secret key goes in Supabase → Authentication → Attack Protection).
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
    },
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      NEXT_PUBLIC_AUTH_COOKIE_DOMAIN:
        process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN,
      NEXT_PUBLIC_AUTH_PROVIDERS: process.env.NEXT_PUBLIC_AUTH_PROVIDERS,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY:
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });
