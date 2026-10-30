import { describe, expect, it, vi } from "vitest";
import { buyDigitalCodes } from "@/lib/digital-codes";
import {
  createReloadlyClient,
  type ReloadlyClient,
} from "@/lib/reloadly/client";

vi.mock("@/env", () => ({ env: {} }));

const code = (id: string, supplier = "reloadly") => ({
  code_id: id,
  face_currency: "USD",
  face_value: 20,
  order_id: "o1",
  supplier,
  supplier_product_id: "120",
  user_id: "u1",
});

const adminWith = (taken: unknown[]) => {
  const rpc = vi.fn((name: string) =>
    Promise.resolve(
      name === "take_digital_codes"
        ? { data: taken, error: null }
        : { data: null, error: null }
    )
  );
  return { admin: { rpc } as never, rpc };
};

const logger = { error: vi.fn() };

describe("buyDigitalCodes", () => {
  it("does nothing without the supplier's keys", async () => {
    const { admin, rpc } = adminWith([code("c1")]);
    await expect(
      buyDigitalCodes({ admin, logger, reloadly: null })
    ).resolves.toEqual({
      delivered: 0,
      failed: 0,
      skipped: 0,
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("buys each code and stores it, or records why not", async () => {
    const { admin, rpc } = adminWith([
      code("c1"),
      code("c2"),
      code("c3", "likecard"),
    ]);
    const reloadly = {
      cards: vi.fn(() =>
        Promise.resolve([{ cardNumber: "ABCD-1234", pinCode: "99" }])
      ),
      order: vi
        .fn()
        .mockResolvedValueOnce({ status: "SUCCESSFUL", transactionId: 7 })
        .mockResolvedValueOnce({ status: "PENDING", transactionId: 8 }),
    } as unknown as ReloadlyClient;

    await expect(buyDigitalCodes({ admin, logger, reloadly })).resolves.toEqual(
      {
        delivered: 1,
        failed: 1,
        skipped: 1,
      }
    );
    expect(reloadly.order).toHaveBeenCalledWith({
      customIdentifier: "c1",
      productId: "120",
      unitPrice: 20,
    });
    expect(rpc).toHaveBeenCalledWith("deliver_digital_code", {
      code: "ABCD-1234",
      pin: "99",
      target: "c1",
      transaction_id: "7",
    });
    expect(rpc).toHaveBeenCalledWith("fail_digital_code", {
      reason: "Order 8 is PENDING",
      target: "c2",
    });
    expect(rpc).toHaveBeenCalledWith("fail_digital_code", {
      reason: "No client for likecard yet",
      target: "c3",
    });
  });
});

describe("createReloadlyClient", () => {
  it("signs in once for the environment's audience and orders one card", async () => {
    const fetcher = vi.fn((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            url.includes("oauth")
              ? { access_token: "t1", expires_in: 3600 }
              : { status: "SUCCESSFUL", transactionId: 5 }
          ),
          { status: 200 }
        )
      )
    );
    const client = createReloadlyClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      environment: "sandbox",
      fetcher: fetcher as unknown as typeof fetch,
    });
    await client.order({
      customIdentifier: "c1",
      productId: "120",
      unitPrice: 20,
    });
    await client.order({
      customIdentifier: "c2",
      productId: "120",
      unitPrice: 20,
    });

    const calls = fetcher.mock.calls as unknown as [string, RequestInit][];
    expect(calls.filter(([url]) => url.includes("oauth"))).toHaveLength(1);
    expect(JSON.parse(String(calls[0]?.[1].body))).toMatchObject({
      audience: "https://giftcards-sandbox.reloadly.com",
      grant_type: "client_credentials",
    });
    expect(calls[1]?.[0]).toBe("https://giftcards-sandbox.reloadly.com/orders");
    expect(JSON.parse(String(calls[1]?.[1].body))).toEqual({
      customIdentifier: "c1",
      productId: 120,
      quantity: 1,
      senderName: "The IDEA",
      unitPrice: 20,
    });
  });

  it("throws the supplier's message on a refused call", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ message: "Bad credentials" }), {
          status: 401,
        })
      )
    );
    const client = createReloadlyClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      environment: "production",
      fetcher: fetcher as unknown as typeof fetch,
    });
    await expect(client.cards(1)).rejects.toThrow("Bad credentials");
  });
});
