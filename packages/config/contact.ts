import { z } from "zod";

/**
 * The website's contact form, shared by the form (apps/web) and the
 * endpoint that sends it (`POST /contact` in apps/api).
 */

/** What a contact message is about; labels are in `web.contact.form.topics`. */
export const contactTopics = [
  "general",
  "store",
  "plus",
  "club",
  "business",
  "careers",
  "press",
] as const;

export type ContactTopic = (typeof contactTopics)[number];

/** The topic named in `?topic=`, if it is one of ours. */
export const parseTopic = (value: unknown): ContactTopic =>
  contactTopics.includes(value as ContactTopic)
    ? (value as ContactTopic)
    : "general";

export const contactRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  message: z.string().trim().min(1).max(5000),
  name: z.string().trim().min(1).max(120),
  topic: z.enum(contactTopics).default("general"),
  /** Left empty by people; filled by bots (the form hides it). */
  website: z.string().max(500).optional(),
});

export type ContactRequest = z.input<typeof contactRequestSchema>;

/** A field the endpoint rejected; the form shows its own message for each. */
export type ContactField = "email" | "message" | "name";

/** Error codes the form translates; never raw messages. */
export type ContactError =
  | "forbidden"
  | "invalid"
  | "rate_limited"
  | "unavailable"
  | "unknown";

export type ContactResponse =
  | { ok: true }
  | { error: ContactError; fields?: ContactField[]; ok: false };

const contactFields = new Set<string>(["email", "message", "name"]);

/** The fields a failed parse points at, for field-level errors. */
export const invalidContactFields = (error: z.ZodError): ContactField[] => [
  ...new Set(
    error.issues
      .map((issue) => String(issue.path[0]))
      .filter((field): field is ContactField => contactFields.has(field))
  ),
];
