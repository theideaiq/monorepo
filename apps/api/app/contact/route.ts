import { project } from "@repo/config";
import { resend, sendEmail } from "@repo/email";
import { ContactTemplate } from "@repo/email/templates/contact";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { createRateLimiter, slidingWindow } from "@repo/rate-limit";
import { protectForm } from "@repo/security/form";
import { createElement } from "react";
import { env } from "@/env";
import { handleContact } from "@/lib/contact";
import { webCorsHeaders, webPreflight } from "@/lib/cors";

export const OPTIONS = webPreflight;

const rateLimiter =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createRateLimiter({ limiter: slidingWindow(1, "1d") })
    : undefined;

/**
 * The website's contact form (public, no sign-in). Only the website's
 * origin may call it from a browser.
 */
export const POST = async (request: Request) => {
  const { body, status } = await handleContact(request, {
    // The team's shared inbox (packages/config/project.json).
    inbox: project.supportEmail ?? env.RESEND_FROM,
    limit: rateLimiter
      ? async (key) => (await rateLimiter.limit(key)).success
      : undefined,
    logError: (error) => log.error(`Contact form failed: ${parseError(error)}`),
    protect: protectForm,
    render: (props) => createElement(ContactTemplate, props),
    send: resend && env.RESEND_FROM ? sendEmail : undefined,
  });

  return Response.json(body, { headers: webCorsHeaders(request), status });
};
