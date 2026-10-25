import { describe, expect, test, vi } from "vitest";

vi.mock("@/env", () => ({
  env: { NEXT_PUBLIC_WEB_URL: "https://theideaiq.com" },
}));

const { notificationUrl } = await import("./telegram-notify");

describe("notifications on Telegram", () => {
  test("open the current page on the website in the member's language", () => {
    expect(notificationUrl("/orders/view?id=o1", "en")).toBe(
      "https://theideaiq.com/pass/orders/o1"
    );
    expect(notificationUrl("/pass/bulbs", "ar")).toBe(
      "https://theideaiq.com/ar/pass/bulbs"
    );
    expect(notificationUrl("//evil.example", "en")).toBe(
      "https://theideaiq.com/pass"
    );
    expect(notificationUrl(null, "ar")).toBe("https://theideaiq.com/ar/pass");
  });
});
