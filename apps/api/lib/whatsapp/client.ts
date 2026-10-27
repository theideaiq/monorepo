/**
 * A small client for the WhatsApp Cloud API (Meta Graph API): template
 * messages only, the one kind a business may start a conversation with.
 * No SDK; `fetch` is injectable for tests.
 */

export const GRAPH_API_VERSION = "v21.0";
const GRAPH_API = "https://graph.facebook.com";

/** The message templates The IDEA registers in WhatsApp Manager. */
export const whatsappTemplates = [
  "order_confirmed",
  "order_shipped",
  "rental_due_soon",
] as const;

export type WhatsAppTemplate = (typeof whatsappTemplates)[number];

export type WhatsAppLanguage = "ar" | "en";

export interface TemplateMessage {
  language: WhatsAppLanguage;
  /** Body variables {{1}}, {{2}}, … in order; each non-empty text. */
  parameters: string[];
  template: WhatsAppTemplate;
  /** The recipient in E.164 (+9647…). */
  to: string;
}

/** `invalid_recipient`: the number isn't on WhatsApp (or can't be messaged). */
export type WhatsAppResult = "sent" | "invalid_recipient" | "failed";

export interface WhatsAppSender {
  send: (message: TemplateMessage) => Promise<WhatsAppResult>;
}

// WhatsApp rejects empty parameters and those with newlines, tabs or more
// than four spaces in a row; the API limit is generous, keep it readable.
const WHITESPACE_RUN = /\s+/g;
const NON_DIGITS = /\D/g;
const MAX_PARAMETER = 200;

const cleanParameter = (value: string) =>
  value.replace(WHITESPACE_RUN, " ").trim().slice(0, MAX_PARAMETER) || "-";

/** The Graph API request body for a template message. */
export const buildTemplatePayload = ({
  language,
  parameters,
  template,
  to,
}: TemplateMessage) => ({
  messaging_product: "whatsapp",
  recipient_type: "individual",
  template: {
    components: parameters.length
      ? [
          {
            parameters: parameters.map((text) => ({
              text: cleanParameter(text),
              type: "text",
            })),
            type: "body",
          },
        ]
      : [],
    language: { code: language },
    name: template,
  },
  // Digits only, without the "+".
  to: to.replace(NON_DIGITS, ""),
  type: "template",
});

export const messagesUrl = (phoneNumberId: string) =>
  `${GRAPH_API}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

// Graph API error codes for a recipient that can't be messaged: 131026
// (not on WhatsApp / can't receive), 131030 (not in the allowed list while
// the number is in test mode).
const RECIPIENT_ERRORS = new Set([131_026, 131_030]);

interface GraphError {
  error?: { code?: number; message?: string };
}

export interface WhatsAppConfig {
  accessToken: string;
  fetch?: typeof fetch;
  /** Called with a short reason when a message isn't sent. */
  onError?: (reason: string) => void;
  phoneNumberId: string;
}

/** A sender bound to one WhatsApp Business phone number. */
export const createWhatsAppSender = ({
  accessToken,
  fetch: fetchImpl = fetch,
  onError,
  phoneNumberId,
}: WhatsAppConfig): WhatsAppSender => ({
  send: async (message) => {
    const response = await fetchImpl(messagesUrl(phoneNumberId), {
      body: JSON.stringify(buildTemplatePayload(message)),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    if (response.ok) {
      return "sent";
    }
    const body = (await response.json().catch(() => ({}))) as GraphError;
    const code = body.error?.code;
    onError?.(
      `WhatsApp ${message.template} failed (${response.status}${code ? `, ${code}` : ""})`
    );
    return code && RECIPIENT_ERRORS.has(code) ? "invalid_recipient" : "failed";
  },
});
