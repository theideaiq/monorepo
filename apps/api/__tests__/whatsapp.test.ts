import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, test, vi } from "vitest";
import {
  buildTemplatePayload,
  createWhatsAppSender,
  messagesUrl,
  type TemplateMessage,
  type WhatsAppResult,
  type WhatsAppSender,
} from "../lib/whatsapp/client";
import { deliverWhatsAppNotifications } from "../lib/whatsapp/deliver";
import {
  templateLanguage,
  templateMessage,
  type WhatsAppNotification,
} from "../lib/whatsapp/templates";

const PHONE_NUMBER_ID = "123456789012345";
const TOKEN = "EAAG-test-token-0000000000";

const message: TemplateMessage = {
  language: "en",
  parameters: ["Uday", "#10042"],
  template: "order_confirmed",
  to: "+9647701234567",
};

/** A fake transport: records requests and answers from a queue. */
const fakeFetch = (responses: Response[]) => {
  const calls: { body: unknown; headers: Headers; url: string }[] = [];
  const impl = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      body: JSON.parse(String(init?.body ?? "null")),
      headers: new Headers(init?.headers),
      url: String(input),
    });
    return Promise.resolve(
      responses.shift() ?? Response.json({ messages: [{ id: "wamid.1" }] })
    );
  });
  return { calls, impl: impl as unknown as typeof fetch };
};

describe("buildTemplatePayload", () => {
  test("builds a Cloud API template message", () => {
    expect(buildTemplatePayload(message)).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      template: {
        components: [
          {
            parameters: [
              { text: "Uday", type: "text" },
              { text: "#10042", type: "text" },
            ],
            type: "body",
          },
        ],
        language: { code: "en" },
        name: "order_confirmed",
      },
      to: "9647701234567",
      type: "template",
    });
  });

  test("keeps parameters on one line and never empty", () => {
    const payload = buildTemplatePayload({
      ...message,
      parameters: ["  Line one\n\tline   two ", "", "x".repeat(300)],
    });
    const texts = payload.template.components[0].parameters.map(
      (parameter) => parameter.text
    );
    expect(texts).toEqual(["Line one line two", "-", "x".repeat(200)]);
  });

  test("omits the body component without parameters", () => {
    expect(
      buildTemplatePayload({ ...message, parameters: [] }).template.components
    ).toEqual([]);
  });
});

describe("createWhatsAppSender", () => {
  test("posts to the phone number's messages endpoint with the token", async () => {
    const { calls, impl } = fakeFetch([]);
    const sender = createWhatsAppSender({
      accessToken: TOKEN,
      fetch: impl,
      phoneNumberId: PHONE_NUMBER_ID,
    });

    await expect(sender.send(message)).resolves.toBe("sent");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`
    );
    expect(messagesUrl(PHONE_NUMBER_ID)).toBe(calls[0]?.url);
    expect(calls[0]?.headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(calls[0]?.headers.get("content-type")).toBe("application/json");
    expect(calls[0]?.body).toEqual(buildTemplatePayload(message));
  });

  test("reports numbers that can't receive WhatsApp", async () => {
    const onError = vi.fn();
    const { impl } = fakeFetch([
      Response.json(
        { error: { code: 131_026, message: "Message undeliverable" } },
        { status: 400 }
      ),
    ]);
    const sender = createWhatsAppSender({
      accessToken: TOKEN,
      fetch: impl,
      onError,
      phoneNumberId: PHONE_NUMBER_ID,
    });

    await expect(sender.send(message)).resolves.toBe("invalid_recipient");
    expect(onError).toHaveBeenCalledWith(
      "WhatsApp order_confirmed failed (400, 131026)"
    );
  });

  test("other errors fail without exposing the response", async () => {
    const onError = vi.fn();
    const { impl } = fakeFetch([new Response("oops", { status: 500 })]);
    const sender = createWhatsAppSender({
      accessToken: TOKEN,
      fetch: impl,
      onError,
      phoneNumberId: PHONE_NUMBER_ID,
    });

    await expect(sender.send(message)).resolves.toBe("failed");
    expect(onError).toHaveBeenCalledWith(
      "WhatsApp order_confirmed failed (500)"
    );
  });
});

const notification = (
  overrides: Partial<WhatsAppNotification>
): WhatsAppNotification => ({
  data: {},
  event: "order_paid",
  first_name: "Uday",
  locale: "en",
  phone: "+9647701234567",
  ...overrides,
});

describe("templateMessage", () => {
  test("order confirmed: name and order number", () => {
    expect(
      templateMessage(notification({ data: { number: 10_042 } }), "ar")
    ).toEqual({
      language: "en",
      parameters: ["Uday", "#10042"],
      template: "order_confirmed",
      to: "+9647701234567",
    });
  });

  test("order shipped: the tracking number, or a placeholder", () => {
    expect(
      templateMessage(
        notification({
          data: { number: 10_042, tracking: "IQ-123" },
          event: "order_shipped",
        }),
        "ar"
      )?.parameters
    ).toEqual(["Uday", "#10042", "IQ-123"]);
    expect(
      templateMessage(
        notification({
          data: { number: 10_042, tracking: null },
          event: "order_shipped",
          first_name: null,
          locale: "ar",
        }),
        "ar"
      )?.parameters
    ).toEqual(["بك", "#10042", "سنرسله إليك قريباً"]);
  });

  test("rental due soon: the item in the recipient's language and the date", () => {
    const result = templateMessage(
      notification({
        data: {
          due_at: "2026-11-02T09:00:00Z",
          name_ar: "لعبة",
          name_en: "Game",
        },
        event: "rental_due_soon",
      }),
      "ar"
    );
    expect(result?.template).toBe("rental_due_soon");
    expect(result?.parameters.slice(0, 2)).toEqual(["Uday", "Game"]);
    expect(result?.parameters[2]).toContain("2026");
  });

  test("Kurdish uses the fallback language", () => {
    expect(templateLanguage("ckb", "ar")).toBe("ar");
    expect(templateLanguage("ckb", "en")).toBe("en");
    expect(templateLanguage("en", "ar")).toBe("en");
  });

  test("no template, no number or missing data: nothing to send", () => {
    expect(
      templateMessage(notification({ event: "support_reply" }), "ar")
    ).toBeNull();
    expect(
      templateMessage(notification({ data: { number: 1 }, phone: null }), "ar")
    ).toBeNull();
    expect(templateMessage(notification({ data: {} }), "ar")).toBeNull();
  });
});

describe("deliverWhatsAppNotifications", () => {
  const claimed = [
    {
      data: { number: 10_042 },
      event: "order_paid",
      first_name: "Uday",
      id: "n1",
      link: "/orders/view?id=1",
      locale: "en",
      phone: "+9647701234567",
      user_id: "u1",
    },
    {
      data: {},
      event: "order_paid",
      first_name: null,
      id: "n2",
      link: null,
      locale: "ar",
      phone: "+9647801234567",
      user_id: "u2",
    },
    {
      data: { number: 10_043, tracking: "IQ-9" },
      event: "order_shipped",
      first_name: "Vian",
      id: "n3",
      link: null,
      locale: "ar",
      phone: "+9647501234567",
      user_id: "u3",
    },
  ];

  const fakeAdmin = (rows: unknown[] | null, error: Error | null = null) => {
    const rpc = vi.fn(() =>
      Promise.resolve({
        data: rows,
        error: error && { message: error.message },
      })
    );
    return { admin: { rpc } as unknown as SupabaseClient<Database>, rpc };
  };

  test("claims, sends each templated notification and counts the results", async () => {
    const { admin, rpc } = fakeAdmin(claimed);
    const results: WhatsAppResult[] = ["sent", "failed"];
    const send = vi.fn(() => Promise.resolve(results.shift() ?? "sent"));
    const sender: WhatsAppSender = { send };

    await expect(
      deliverWhatsAppNotifications(admin, sender, {
        fallbackLanguage: "ar",
        ids: ["n1"],
      })
    ).resolves.toEqual({ failed: 1, notifications: 3, sent: 1, skipped: 1 });
    expect(rpc).toHaveBeenCalledWith("claim_whatsapp_notifications", {
      notification_ids: ["n1"],
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        template: "order_shipped",
        to: "+9647501234567",
      })
    );
  });

  test("the sweep claims without ids; a throwing sender counts as failed", async () => {
    const { admin, rpc } = fakeAdmin([claimed[0]]);
    const sender: WhatsAppSender = {
      send: () => Promise.reject(new Error("network")),
    };

    await expect(
      deliverWhatsAppNotifications(admin, sender, { fallbackLanguage: "ar" })
    ).resolves.toEqual({ failed: 1, notifications: 1, sent: 0, skipped: 0 });
    expect(rpc).toHaveBeenCalledWith("claim_whatsapp_notifications", {});
  });

  test("surfaces a claim error", async () => {
    const { admin } = fakeAdmin(null, new Error("db down"));
    const sender: WhatsAppSender = { send: vi.fn() };
    await expect(
      deliverWhatsAppNotifications(admin, sender, { fallbackLanguage: "ar" })
    ).rejects.toThrow("db down");
  });
});
