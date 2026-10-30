import { describe, expect, test, vi } from "vitest";
import { reminderItems, sendReminders } from "../lib/reminders";

const WEB = "https://theideaiq.com";

const record = {
  name_ar: "تسجيل",
  name_en: "Record",
  slug: "a-record",
};

const fakeAdmin = (
  reviews: unknown[],
  carts: unknown[],
  error: { message: string } | null = null
) =>
  ({
    rpc: vi.fn((name: string) =>
      Promise.resolve(
        name === "take_review_requests"
          ? { data: reviews, error }
          : { data: carts, error: null }
      )
    ),
  }) as unknown as Parameters<typeof sendReminders>[0]["admin"];

describe("reminder items", () => {
  test("link each product's review form in the member's language", () => {
    expect(reminderItems([record], "review", "en", WEB)).toEqual([
      {
        href: "https://theideaiq.com/store/a-record#reviews",
        name: "Record",
        quantity: undefined,
      },
    ]);
    expect(
      reminderItems([{ ...record, quantity: 2 }], "cart", "ar", WEB)[0]
    ).toEqual({
      href: "https://theideaiq.com/ar/store/a-record",
      name: "تسجيل",
      quantity: 2,
    });
  });

  test("list at most five", () => {
    expect(
      reminderItems(new Array(8).fill(record), "cart", "en", WEB)
    ).toHaveLength(5);
  });
});

describe("sending reminders", () => {
  test("emails each review request and cart reminder handed out", async () => {
    const send = vi.fn(() => Promise.resolve());
    const result = await sendReminders({
      admin: fakeAdmin(
        [{ email: "r@example.iq", items: [record], locale: "en" }],
        [
          { email: "c@example.iq", items: [record], locale: "ar" },
          { email: null, items: [record], locale: "ar" },
        ]
      ),
      logger: { error: vi.fn() },
      send,
      webUrl: WEB,
    });
    expect(result).toEqual({ carts: 1, reviews: 1 });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "How was your order?",
        to: "r@example.iq",
      })
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "ما زالت في سلتك",
        to: "c@example.iq",
      })
    );
  });

  test("a failed email is logged and the others still go", async () => {
    const logger = { error: vi.fn() };
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("Resend is down"))
      .mockResolvedValue(undefined);
    const result = await sendReminders({
      admin: fakeAdmin(
        [
          { email: "a@example.iq", items: [record], locale: "en" },
          { email: "b@example.iq", items: [record], locale: "en" },
        ],
        []
      ),
      logger,
      send,
      webUrl: WEB,
    });
    expect(result.reviews).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Resend is down")
    );
  });

  test("a database error stops the run", async () => {
    await expect(
      sendReminders({
        admin: fakeAdmin([], [], { message: "boom" }),
        logger: { error: vi.fn() },
        send: vi.fn(),
        webUrl: WEB,
      })
    ).rejects.toThrow("boom");
  });
});
