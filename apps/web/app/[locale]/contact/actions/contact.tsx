"use server";

import { project } from "@repo/config";
import { resend } from "@repo/email";
import { ContactTemplate } from "@repo/email/templates/contact";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { createRateLimiter, slidingWindow } from "@repo/rate-limit";
import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import { contactTopics } from "../topics";

const contactSchema = z.object({
  email: z.email().max(254),
  message: z.string().trim().min(1).max(5000),
  name: z.string().trim().min(1).max(120),
  topic: z.enum(contactTopics).default("general"),
});

export type ContactInput = z.input<typeof contactSchema>;

/** Error codes the form translates; never raw messages. */
export type ContactResult =
  | { ok: true }
  | {
      error: "invalid" | "rate_limited" | "unavailable" | "unknown";
      ok: false;
    };

export const contact = async (input: ContactInput): Promise<ContactResult> => {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid", ok: false };
  }

  if (!(resend && env.RESEND_FROM)) {
    return { error: "unavailable", ok: false };
  }

  try {
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      const rateLimiter = createRateLimiter({
        limiter: slidingWindow(1, "1d"),
      });
      const head = await headers();
      const ip = head.get("x-forwarded-for");

      const { success } = await rateLimiter.limit(`contact_form_${ip}`);

      if (!success) {
        return { error: "rate_limited", ok: false };
      }
    }

    const { email, message, name, topic } = parsed.data;
    await resend.emails.send({
      from: env.RESEND_FROM,
      react: <ContactTemplate email={email} message={message} name={name} />,
      replyTo: email,
      subject: `Contact form (${topic}): ${name}`,
      // The team's shared inbox (packages/config/project.json).
      to: project.supportEmail ?? env.RESEND_FROM,
    });

    return { ok: true };
  } catch (error) {
    log.error(`Contact form failed: ${parseError(error)}`);
    return { error: "unknown", ok: false };
  }
};
