import ar from "@repo/internationalization/messages/ar.json";
import en from "@repo/internationalization/messages/en.json";
import { createTranslator } from "next-intl";
import { describe, expect, test } from "vitest";
import { toCheckoutError, toGiftError } from "@/lib/errors";
import { giftUrl } from "@/lib/gifts";
import { describeNotification } from "@/lib/notifications";

const notify = (event: string, data: Record<string, number | string>) => {
  const t = createTranslator({
    locale: "en",
    messages: en,
    namespace: "store.notifications",
  });
  const text = describeNotification({ data, event, kind: "order" }, "en");
  return t(text.body, text.values);
};

describe("gifts", () => {
  test("the link keeps the language and escapes the token", () => {
    expect(giftUrl("https://theideaiq.com", "en", "ab12")).toBe(
      "https://theideaiq.com/gift/ab12"
    );
    expect(giftUrl("https://theideaiq.com", "ar", "a/b")).toBe(
      "https://theideaiq.com/ar/gift/a%2Fb"
    );
  });

  test("claim errors map to messages", () => {
    expect(toGiftError({ code: "P0002", message: "Gift not found" })).toBe(
      "notFound"
    );
    expect(
      toGiftError({ code: "23514", message: "This gift is from you" })
    ).toBe("yours");
    expect(
      toGiftError({ code: "23514", message: "This gift isn't ready yet" })
    ).toBe("notReady");
    expect(
      toGiftError({ code: "23514", message: "Verify your phone number first" })
    ).toBe("phoneUnverified");
    expect(toGiftError(new Error("boom"))).toBe("unknown");
    expect(
      toCheckoutError({ code: "23514", message: "Choose where the gift goes" })
    ).toBe("zoneUnavailable");
  });

  test("every gift error has a message in both languages", () => {
    for (const messages of [en, ar]) {
      const t = createTranslator({
        locale: "en",
        messages,
        namespace: "web.gift.errors",
      });
      for (const error of [
        "invalidAddress",
        "notFound",
        "notReady",
        "phoneUnverified",
        "suspended",
        "unknown",
        "yours",
      ] as const) {
        expect(t(error)).not.toContain("web.gift");
      }
    }
  });

  test("the buyer hears it was claimed, the recipient that it ships", () => {
    expect(notify("gift_claimed", { name: "Rana", number: 10_001 })).toBe(
      "Rana accepted the gift in order #10001. It ships to them now."
    );
    expect(notify("gift_shipped", { number: 10_001 })).toBe(
      "The gift in order #10001 has shipped to you."
    );
  });
});
