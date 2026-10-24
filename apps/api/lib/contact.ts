import {
  type ContactField,
  type ContactResponse,
  contactRequestSchema,
  invalidContactFields,
} from "@repo/config/contact";
import type { FormVerdict } from "@repo/security/form";
import type { ReactElement } from "react";

export interface ContactEmail {
  react: ReactElement;
  replyTo: string;
  subject: string;
  to: string;
}

export interface ContactDeps {
  /** The team's inbox; undefined when email isn't configured. */
  inbox: string | undefined;
  /** One message per address per day (Upstash); undefined when unset. */
  limit?: (key: string) => Promise<boolean>;
  logError: (error: unknown) => void;
  /** Arcjet's form guard (shield, bots, burst limit, mail-less addresses). */
  protect: (request: Request, email: string) => Promise<FormVerdict>;
  /** Renders the email body (the React Email template). */
  render: (props: {
    email: string;
    message: string;
    name: string;
  }) => ReactElement;
  /** Sends the email; undefined when Resend isn't configured. */
  send: ((email: ContactEmail) => Promise<unknown>) | undefined;
}

export interface ContactResult {
  body: ContactResponse;
  status: number;
}

const fail = (
  status: number,
  error: Extract<ContactResponse, { ok: false }>["error"],
  fields?: ContactField[]
): ContactResult => ({
  body: fields ? { error, fields, ok: false } : { error, ok: false },
  status,
});

/** The visitor's address: Vercel sets both headers on every request. */
export const clientIp = (request: Request) =>
  request.headers.get("x-real-ip") ??
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  "unknown";

/**
 * The website's contact form: validates the message, runs the form guard and
 * the daily limit, then emails the team with Reply-To set to the visitor.
 * Answers with error codes the form translates, never raw messages.
 */
export const handleContact = async (
  request: Request,
  deps: ContactDeps
): Promise<ContactResult> => {
  const parsed = contactRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return fail(400, "invalid", invalidContactFields(parsed.error));
  }

  const { email, message, name, topic, website } = parsed.data;
  // The honeypot: pretend it worked so bots learn nothing.
  if (website) {
    return { body: { ok: true }, status: 200 };
  }

  const { inbox, send } = deps;
  if (!(send && inbox)) {
    return fail(503, "unavailable");
  }

  try {
    const verdict = await deps.protect(request, email);
    if (verdict === "rate_limited") {
      return fail(429, "rate_limited");
    }
    if (verdict === "invalid_email") {
      return fail(400, "invalid", ["email"]);
    }
    if (verdict === "bot") {
      return fail(403, "forbidden");
    }

    if (
      deps.limit &&
      !(await deps.limit(`contact_form_${clientIp(request)}`))
    ) {
      return fail(429, "rate_limited");
    }

    await send({
      react: deps.render({ email, message, name }),
      replyTo: email,
      subject: `Contact form (${topic}): ${name}`,
      to: inbox,
    });
    return { body: { ok: true }, status: 200 };
  } catch (error) {
    deps.logError(error);
    return fail(502, "unknown");
  }
};
