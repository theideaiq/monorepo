import { describe, expect, test, vi } from "vitest";
import { BoxyError, createBoxyClient } from "@/lib/boxy/client";
import {
  boxyPhone,
  buildBoxyOrder,
  cashToCollect,
  type OrderForBoxy,
} from "@/lib/boxy/order-request";
import { deliversOrder, shipmentUpdate } from "@/lib/boxy/sync";
import { webhookReference } from "@/lib/boxy/webhook";

const order = (extra: Partial<OrderForBoxy> = {}): OrderForBoxy => ({
  number: 1024,
  paid_at: null,
  payment_method: "cash_on_delivery",
  shipping_address: {
    address: "Street 14, near the park",
    city: "الكرادة",
    full_name: "Sara Ali",
    notes: "Call first",
    phone: "+9647701234567",
  },
  shipping_fee: 5000,
  total: 74_750,
  ...extra,
});

const lines = [{ name: "Adele – 21 (Vinyl)", quantity: 1, unitPrice: 69_750 }];

describe("the Boxy order", () => {
  test("a cash order collects its total: the items plus a delivery line", () => {
    const request = buildBoxyOrder({
      fragile: true,
      lines,
      order: order(),
      province: "BGD",
      size: "M",
    });
    expect(request.payment_type).toBe("COLLECT_ON_DELIVERY");
    expect(request.shipment_fee_type).toBe("BY_MERCHANT");
    expect(request.products).toEqual([
      { price: 69_750, quantity: 1, title: "Adele – 21 (Vinyl)" },
      { price: 5000, quantity: 1, title: "Delivery / التوصيل" },
    ]);
    expect(
      request.products.reduce((sum, p) => sum + p.price * p.quantity, 0)
    ).toBe(74_750);
    expect(request.contact).toMatchObject({
      phone: "9647701234567",
      province_code: "BGD",
      region_name: "الكرادة",
    });
    expect(request.custom_id).toBe("1024");
    expect(request.description).toBe("The IDEA order #1024 · Call first");
    expect(request.is_fragile).toBe(true);
  });

  test("a discounted cash order collects its total as one line", () => {
    const request = buildBoxyOrder({
      fragile: false,
      lines,
      order: order({ total: 60_000 }),
      province: "BGD",
      size: "S",
    });
    expect(request.products).toEqual([
      { price: 60_000, quantity: 1, title: "The IDEA order #1024" },
    ]);
  });

  test("an order paid online collects nothing", () => {
    const paid = order({
      paid_at: "2026-10-25T10:00:00Z",
      payment_method: "online",
    });
    expect(cashToCollect(paid)).toBe(0);
    const request = buildBoxyOrder({
      fragile: false,
      lines,
      order: paid,
      pickupLocation: "01JG1N4R1BCEN1V5NKRBP6YEY5",
      province: "BAS",
      size: "L",
    });
    expect(request.payment_type).toBe("PREPAID");
    expect(request.products).toHaveLength(1);
    expect(request.saved_pick_up_address_uid).toBe(
      "01JG1N4R1BCEN1V5NKRBP6YEY5"
    );
  });

  test("phone numbers lose the plus", () => {
    expect(boxyPhone("+9647701234567")).toBe("9647701234567");
  });
});

describe("following a parcel", () => {
  const parcel = (slug: string) => ({
    fee: 4000,
    last_statuses: [
      {
        pivot: { created_at: "2026-10-25T09:00:00Z" },
        slug: "new",
        title: "New",
      },
      {
        pivot: {
          carrier_message: "Left with family",
          created_at: "2026-10-26T12:00:00Z",
        },
        slug,
        title: slug,
      },
    ],
    platform_code: "BXO-253478507",
    status: { slug, title: slug },
    tracking_page: "https://tracking.tryboxy.com/tracking/BXO-253478507",
    uid: "01JK8FT6FM9MB9KAA52WZDQYQY",
  });
  const open = { delivered_at: null, returned_at: null };
  const now = "2026-10-26T12:05:00Z";

  test("a delivered parcel delivers the order, once", () => {
    const update = shipmentUpdate(parcel("delivered"), open, now);
    expect(update.delivered_at).toBe(now);
    expect(deliversOrder(update)).toBe(true);
    expect(update.history[1]).toEqual({
      at: "2026-10-26T12:00:00Z",
      message: "Left with family",
      status: "delivered",
      title: "delivered",
    });
    expect(update.tracking_url).toContain("BXO-253478507");
    const again = shipmentUpdate(
      parcel("delivered"),
      { delivered_at: now, returned_at: null },
      now
    );
    expect(deliversOrder(again)).toBe(false);
  });

  test("a returned parcel is marked returned; others only change status", () => {
    expect(shipmentUpdate(parcel("returned"), open, now).returned_at).toBe(now);
    const moving = shipmentUpdate(parcel("in-transit"), open, now);
    expect(moving.status).toBe("in-transit");
    expect(moving.delivered_at).toBeUndefined();
    expect(moving.returned_at).toBeUndefined();
  });

  test("Boxy asking The IDEA to act is kept", () => {
    const update = shipmentUpdate(
      {
        ...parcel("on-hold"),
        merchant_action_required: 1,
        merchant_action_required_merchant_text: "Customer refused the parcel",
      },
      open,
      now
    );
    expect(update.action_required).toBe("Customer refused the parcel");
  });
});

describe("webhooks", () => {
  test("find the parcel in the payload", () => {
    expect(
      webhookReference({
        data: {
          order: {
            platform_code: "BXO-1",
            uid: "01JK8FT6FM9MB9KAA52WZDQYQY",
          },
        },
        event: "order in_transit",
      })
    ).toEqual({ carrierId: "01JK8FT6FM9MB9KAA52WZDQYQY" });
    expect(webhookReference({ order: { custom_id: "1024" } })).toEqual({
      orderNumber: 1024,
    });
    expect(
      webhookReference({ order_uid: "01JK8FT6FM9MB9KAA52WZDQYQY" })
    ).toEqual({ carrierId: "01JK8FT6FM9MB9KAA52WZDQYQY" });
    expect(webhookReference({ hello: "world" })).toBeNull();
  });
});

describe("the Boxy client", () => {
  const reply = (body: unknown, status = 200, type = "application/json") =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      headers: { "content-type": type },
      status,
    });

  test("sends the key and secret and reads the envelope", async () => {
    const fetcher = vi.fn(async () =>
      reply({ code: 200, object: { uid: "u1" }, status: "success" })
    );
    const boxy = createBoxyClient({
      apiKey: "key-12345",
      apiSecret: "secret-12345",
      baseUrl: "https://api-stg.tryboxy.dev/api/v1",
      fetcher: fetcher as unknown as typeof fetch,
    });
    await expect(boxy.getOrder("u1")).resolves.toEqual({ uid: "u1" });
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe(
      "https://api-stg.tryboxy.dev/api/v1/merchants/orders/u1"
    );
    expect(init.headers).toMatchObject({
      "api-key": "key-12345",
      "api-secret": "secret-12345",
    });
  });

  test("a refused call is a BoxyError with its status", async () => {
    const boxy = createBoxyClient({
      apiKey: "k",
      apiSecret: "s",
      baseUrl: "https://api.tryboxy.com/api/v1",
      fetcher: (async () =>
        reply(
          { message: "Region not found", status: "fail" },
          400
        )) as typeof fetch,
    });
    await expect(boxy.cancelOrder("u1")).rejects.toMatchObject({
      message: "Region not found",
      name: "BoxyError",
      status: 400,
    });
    expect(BoxyError).toBeDefined();
  });

  test("labels come back as a PDF or a link", async () => {
    const pdf = createBoxyClient({
      apiKey: "k",
      apiSecret: "s",
      baseUrl: "https://api.tryboxy.com/api/v1",
      fetcher: (async () =>
        reply("%PDF-1.4", 200, "application/pdf")) as typeof fetch,
    });
    expect((await pdf.label("u1")).kind).toBe("pdf");
    const link = createBoxyClient({
      apiKey: "k",
      apiSecret: "s",
      baseUrl: "https://api.tryboxy.com/api/v1",
      fetcher: (async () =>
        reply({
          object: "https://cdn.tryboxy.com/l.pdf",
          status: "success",
        })) as typeof fetch,
    });
    expect(await link.label("u1")).toEqual({
      kind: "url",
      url: "https://cdn.tryboxy.com/l.pdf",
    });
  });
});
