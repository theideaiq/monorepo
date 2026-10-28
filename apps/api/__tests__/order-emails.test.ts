import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, test, vi } from "vitest";
import { orderEmailContent, sendOrderEmails } from "../lib/order-emails";

const ORDER = {
  currency: "IQD",
  id: "order-1",
  number: 10_042,
  order_items: [
    {
      attributes: {},
      name_ar: "بلايستيشن 5",
      name_en: "PlayStation 5",
      quantity: 1,
      unit_price: 720_000,
    },
    {
      attributes: { Color: "Black" },
      name_ar: "يد تحكم",
      name_en: "DualSense controller",
      quantity: 2,
      unit_price: 95_000,
    },
  ],
  payment_method: "online" as const,
  shipping_address: {
    address: "Street 52",
    city: "Karrada",
    full_name: "Sara Ahmed",
    governorate: "baghdad",
    phone: "+9647700000000",
  },
  shipping_fee: 5000,
  subtotal: 910_000,
  total: 915_000,
  user_id: "user-1",
};

const fakeAdmin = ({
  email,
  locale,
}: {
  email?: string;
  locale: "ar" | "en";
}) => {
  const query = (row: unknown) => {
    const builder = {
      eq: () => builder,
      maybeSingle: () => Promise.resolve({ data: row, error: null }),
      select: () => builder,
    };
    return builder;
  };
  return {
    auth: {
      admin: {
        getUserById: () =>
          Promise.resolve({
            data: { user: { email, id: "user-1", phone: "+9647700000000" } },
          }),
      },
    },
    from: (table: string) => query(table === "orders" ? ORDER : { locale }),
  } as unknown as SupabaseClient<Database>;
};

describe("sendOrderEmails", () => {
  test("sends an English receipt and a store notification", async () => {
    const send = vi.fn(() => Promise.resolve());
    await sendOrderEmails("order-1", {
      admin: fakeAdmin({ email: "sara@example.com", locale: "en" }),
      logger: { info: vi.fn() },
      notifyTo: "orders@theideaiq.com",
      send,
    });

    expect(send).toHaveBeenCalledTimes(2);
    const [receipt, notification] = send.mock.calls.map(
      (call) => (call as unknown as [Record<string, unknown>])[0]
    );
    expect(receipt?.to).toBe("sara@example.com");
    expect(receipt?.subject).toBe("Your order #10042 is confirmed");
    expect(receipt?.react).toBeDefined();
    expect(receipt?.text).toContain("2 × DualSense controller (Color: Black)");
    expect(receipt?.text).toContain("Baghdad, Karrada");
    expect(notification?.to).toBe("orders@theideaiq.com");
    expect(notification?.subject).toContain("#10042");
    expect(notification?.text).toContain("sara@example.com");
  });

  test("writes Arabic receipts for Arabic profiles", async () => {
    const send = vi.fn(() => Promise.resolve());
    await sendOrderEmails("order-1", {
      admin: fakeAdmin({ email: "sara@example.com", locale: "ar" }),
      logger: { info: vi.fn() },
      send,
    });
    const [receipt] = send.mock.calls.map(
      (call) => (call as unknown as [Record<string, unknown>])[0]
    );
    expect(receipt?.subject).toBe("تم تأكيد طلبك #10042");
    expect(receipt?.text).toContain("بغداد");
  });

  test("skips and logs customers without an email", async () => {
    const send = vi.fn(() => Promise.resolve());
    const info = vi.fn();
    await sendOrderEmails("order-1", {
      admin: fakeAdmin({ locale: "ar" }),
      logger: { info },
      notifyTo: "orders@theideaiq.com",
      send,
    });
    expect(info).toHaveBeenCalledWith(
      "Order confirmation not emailed (no email address)",
      expect.objectContaining({ orderId: "order-1" })
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "orders@theideaiq.com" })
    );
  });
});

describe("orderEmailContent", () => {
  test("a delivery order keeps the customer's address", () => {
    const content = orderEmailContent(ORDER, "ar");
    expect(content).toMatchObject({ cash: false });
    expect(content.address.address).toBe("Street 52");
  });
});
