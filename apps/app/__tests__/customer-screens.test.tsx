import type { Database } from "@repo/database";
import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { fakeDb } from "./fake-db";
import { renderWithApp } from "./render";
import { router, searchParams } from "./setup";

const track = vi.fn();
vi.mock("@repo/analytics/client", () => ({
  getAttribution: () => ({}),
  resetIdentity: vi.fn(),
  track,
}));

const openCheckout = vi.fn(async () => undefined);
vi.mock("@/lib/hosted-checkout", () => ({
  checkoutReturnUrl: (locale: string, path: string) =>
    `http://localhost:3000/${locale}${path}`,
  openCheckout,
}));

const { Checkout } = await import("@/components/screens/checkout");
const { Product } = await import("@/components/screens/product");
const { Events } = await import("@/components/screens/events");
const { Business } = await import("@/components/screens/business");
const { Plus } = await import("@/components/screens/plus");
const { OrderDetail } = await import("@/components/screens/order-detail");
const { RequireOnboarding } = await import("@/components/gates");
const { OrganizationProvider } = await import(
  "@/components/organization-provider"
);
const { rememberCheckout } = await import("@/lib/checkout-tracking");

const USER_ID = "user-1";
const PLACE_ORDER = /Place order and pay/;
const PLACE_ORDER_AR = /أكّد الطلب وادفع/;
const JOIN_FOR = /Join for/;
const PAY_NOW = /Pay now/;

beforeAll(() => {
  // The sidebar asks whether it is on a phone.
  window.matchMedia ??= ((query: string) => ({
    addEventListener: vi.fn(),
    matches: false,
    media: query,
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.unstubAllGlobals();
  track.mockClear();
  openCheckout.mockClear();
  router.replace.mockClear();
});

const renderScreen = (
  ui: ReactNode,
  supabase: SupabaseClient<Database>,
  locale: "ar" | "en" = "en"
) =>
  renderWithApp(<SidebarProvider>{ui}</SidebarProvider>, { locale, supabase });

const stubApi = (
  body: object = { referenceId: "ref-1", url: "https://pay.example/1" }
) => {
  const fetchMock = vi.fn(async () => Response.json(body));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const requestBody = (fetchMock: ReturnType<typeof stubApi>, index = 0) => {
  const [url, init] = fetchMock.mock.calls[index] as unknown as [
    string,
    RequestInit,
  ];
  return { body: JSON.parse(String(init.body)), url };
};

const profile = {
  avatar_url: null,
  created_at: "2026-11-01T00:00:00Z",
  full_name: "Sara Ali",
  id: USER_ID,
  locale: "en",
  marketing_opt_in: false,
  updated_at: "2026-11-01T00:05:00Z",
};

const saleProduct = {
  compare_at_price: null,
  currency: "IQD",
  id: "p1",
  images: [],
  kind: "sale",
  name_ar: "سماعة",
  name_en: "Headset",
  price: 50_000,
  slug: "headset",
  status: "active",
  stock_count: 4,
};

const order = (status = "pending") => ({
  created_at: "2026-11-02T10:00:00Z",
  currency: "IQD",
  id: "o1",
  number: 10_001,
  order_items: [
    {
      attributes: {},
      id: "i1",
      name_ar: "سماعة",
      name_en: "Headset",
      product_id: "p1",
      quantity: 1,
      unit_price: 50_000,
      variant_id: null,
    },
  ],
  paid_at: status === "pending" ? null : "2026-11-02T10:05:00Z",
  shipping_address: {
    address: "Karrada",
    city: "",
    full_name: "Sara Ali",
    governorate: "baghdad",
    notes: "",
    phone: "+9647701234567",
  },
  shipping_fee: 5000,
  status,
  subtotal: 50_000,
  total: 55_000,
  tracking_number: null,
});

describe("checkout", () => {
  const setup = (createOrder: { data: unknown; error: unknown }) =>
    fakeDb({
      results: {
        "cart_items.select": {
          data: [
            {
              id: "c1",
              product: saleProduct,
              product_id: "p1",
              quantity: 1,
              variant: null,
              variant_id: null,
            },
          ],
          error: null,
        },
        "orders.select": { data: [order()], error: null },
        "profiles.select": { data: [profile], error: null },
        "store_settings.select": {
          data: [{ free_shipping_threshold: null, shipping_fee: 5000 }],
          error: null,
        },
      },
      rpcs: { create_order: createOrder },
    });

  const chooseBaghdad = () => {
    const select = document.querySelector("select");
    if (!select) {
      throw new Error("No governorate select");
    }
    fireEvent.change(select, { target: { value: "baghdad" } });
  };

  test("places the order and opens the hosted checkout", async () => {
    const db = setup({ data: { id: "o1" }, error: null });
    const fetchMock = stubApi();
    renderScreen(<Checkout />, db.supabase);

    const name = (await screen.findByLabelText(
      "Full name"
    )) as HTMLInputElement;
    expect(name.value).toBe("Sara Ali");
    // The account phone, in E.164, kept left-to-right.
    const phone = screen.getByLabelText("Mobile number") as HTMLInputElement;
    expect(phone.value).toBe("+9647701234567");
    expect(phone.getAttribute("dir")).toBe("ltr");

    const submit = screen.getByRole("button", { name: PLACE_ORDER });
    fireEvent.click(submit);
    expect(await screen.findByText("Choose a governorate.")).toBeTruthy();
    expect(screen.getByText("Enter the delivery address.")).toBeTruthy();
    expect(db.rpc).not.toHaveBeenCalled();

    chooseBaghdad();
    fireEvent.change(screen.getByLabelText("Address"), {
      target: { value: "Karrada, street 62" },
    });
    fireEvent.click(submit);

    await waitFor(() =>
      expect(openCheckout).toHaveBeenCalledWith("https://pay.example/1")
    );
    expect(db.rpcCalls[0]).toEqual({
      args: {
        shipping: {
          address: "Karrada, street 62",
          city: "",
          full_name: "Sara Ali",
          governorate: "baghdad",
          notes: "",
          phone: "+9647701234567",
        },
      },
      name: "create_order",
    });
    const { body, url } = requestBody(fetchMock);
    expect(url).toBe("http://localhost:3002/orders/checkout");
    expect(body).toMatchObject({
      orderId: "o1",
      redirectUrl: "http://localhost:3000/en/orders/view?id=o1",
    });
    expect(track).toHaveBeenCalledWith(
      "begin_checkout",
      expect.objectContaining({ currency: "IQD", value: 55_000 })
    );
    // Remembered, to report the purchase once the order is paid.
    expect(sessionStorage.getItem("billing:pending-checkout")).toContain(
      "ref-1"
    );
  });

  test("explains stock problems in the reader's language", async () => {
    const db = setup({
      data: null,
      error: { code: "23514", message: "Not enough stock" },
    });
    stubApi();
    renderScreen(<Checkout />, db.supabase, "ar");

    await screen.findByLabelText("الاسم الكامل");
    chooseBaghdad();
    fireEvent.change(screen.getByLabelText("العنوان"), {
      target: { value: "الكرادة" },
    });
    fireEvent.click(screen.getByRole("button", { name: PLACE_ORDER_AR }));

    expect(
      await screen.findByText(
        "الكمية المتوفرة من بعض المنتجات غير كافية. راجع سلتك."
      )
    ).toBeTruthy();
    expect(openCheckout).not.toHaveBeenCalled();
  });
});

describe("product page", () => {
  test("adds one copy from a website deep link (?slug=…&add=1)", async () => {
    searchParams.current = new URLSearchParams("slug=headset&add=1");
    const db = fakeDb({
      results: {
        "products.select": {
          data: [
            {
              ...saleProduct,
              category: null,
              condition: "new",
              description_ar: null,
              description_en: "Wireless.",
              details: { Battery: "30 h" },
              product_variants: [],
            },
          ],
          error: null,
        },
      },
    });
    renderScreen(<Product />, db.supabase);

    expect(await screen.findByText("Added to your cart.")).toBeTruthy();
    const insert = db.calls.find(
      (call) => call.table === "cart_items" && call.operation === "insert"
    );
    expect(insert?.payload).toEqual({
      product_id: "p1",
      quantity: 1,
      user_id: USER_ID,
      variant_id: null,
    });
    expect(router.replace).toHaveBeenCalled();
    expect(screen.getByText("30 h")).toBeTruthy();
  });
});

describe("events", () => {
  test("RSVPs, explains a full event and shows the calendar link", async () => {
    const db = fakeDb({
      results: {
        "event_rsvps.insert": {
          data: null,
          error: { code: "23514", message: "This event is full" },
        },
        "events.select": {
          data: [
            {
              capacity: null,
              cover_image: null,
              description_ar: null,
              description_en: "An evening of poetry.",
              ends_at: null,
              id: "e1",
              location: "Baghdad",
              slug: "poetry-night",
              starts_at: "2099-01-01T18:00:00Z",
              title_ar: "أمسية شعرية",
              title_en: "Poetry night",
            },
          ],
          error: null,
        },
      },
      rpcs: {
        event_rsvp_count: { data: 12, error: null },
        my_calendar_token: { data: "tok-1", error: null },
      },
    });
    renderScreen(<Events />, db.supabase);

    fireEvent.click(await screen.findByRole("button", { name: "RSVP" }));
    expect(await screen.findByText("This event is full.")).toBeTruthy();
    expect(screen.getByText("Going: 12")).toBeTruthy();
    expect(
      ((await screen.findByLabelText("Calendar link")) as HTMLInputElement)
        .value
    ).toBe("http://localhost:3002/calendar/tok-1.ics");
  });
});

describe("accounts without organizations", () => {
  test("the app opens without a business account", async () => {
    const db = fakeDb({
      results: {
        "memberships.select": { data: [], error: null },
        "profiles.select": { data: [profile], error: null },
      },
    });
    renderScreen(
      <OrganizationProvider>
        <RequireOnboarding>
          <p>inside the app</p>
        </RequireOnboarding>
      </OrganizationProvider>,
      db.supabase
    );

    expect(await screen.findByText("inside the app")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test("new accounts go through onboarding first", async () => {
    const db = fakeDb({
      results: {
        "memberships.select": { data: [], error: null },
        "profiles.select": {
          data: [{ ...profile, updated_at: profile.created_at }],
          error: null,
        },
      },
    });
    renderScreen(
      <OrganizationProvider>
        <RequireOnboarding>
          <p>inside the app</p>
        </RequireOnboarding>
      </OrganizationProvider>,
      db.supabase
    );

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        expect.stringContaining("/en/onboarding")
      )
    );
    expect(screen.queryByText("inside the app")).toBeNull();
  });

  test("Business offers to create or join one", async () => {
    const db = fakeDb({
      results: { "memberships.select": { data: [], error: null } },
      rpcs: {
        pending_invitations: {
          data: [
            {
              organization_name: "Rafidain Trading",
              role: "member",
              token: "t1",
            },
          ],
          error: null,
        },
      },
    });
    renderScreen(
      <OrganizationProvider>
        <Business />
      </OrganizationProvider>,
      db.supabase
    );

    expect(
      await screen.findByText("Bring your company to IDEA Suite")
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Create a business account" })
    ).toBeTruthy();
    expect(await screen.findByText("Rafidain Trading")).toBeTruthy();
  });
});

describe("IDEA Plus", () => {
  test("subscribes without an organization", async () => {
    const db = fakeDb({
      results: {
        "plans.select": {
          data: [
            {
              amount: 15_000,
              billing_interval: "month",
              currency: "IQD",
              description: null,
              features_ar: [],
              features_en: ["Two items at a time"],
              id: "plus-1",
              name: "Plus",
              rental_slots: 2,
            },
          ],
          error: null,
        },
      },
      rpcs: {
        my_rental_allowance: { data: [{ in_use: 0, slots: 0 }], error: null },
      },
    });
    const fetchMock = stubApi();
    renderScreen(<Plus />, db.supabase);

    expect(await screen.findByText("Up to 2 items at a time")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: JOIN_FOR }));

    await waitFor(() => expect(openCheckout).toHaveBeenCalled());
    const { body, url } = requestBody(fetchMock);
    expect(url).toBe("http://localhost:3002/checkout");
    expect(body.planId).toBe("plus-1");
    expect(body).not.toHaveProperty("organizationId");
  });
});

describe("orders", () => {
  test("cancels a pending order", async () => {
    searchParams.current = new URLSearchParams("id=o1");
    const db = fakeDb({
      results: { "orders.select": { data: [order()], error: null } },
      rpcs: { cancel_order: { data: null, error: null } },
    });
    renderScreen(<OrderDetail />, db.supabase);

    expect(
      await screen.findByText("This order is waiting for payment.")
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: PAY_NOW })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
    const buttons = await screen.findAllByRole("button", {
      name: "Cancel order",
    });
    fireEvent.click(buttons.at(-1) as HTMLElement);

    await waitFor(() =>
      expect(db.rpcCalls).toContainEqual({
        args: { order_id: "o1" },
        name: "cancel_order",
      })
    );
  });

  test("reports the purchase when back from a paid checkout", async () => {
    searchParams.current = new URLSearchParams("id=o1");
    rememberCheckout({
      currency: "IQD",
      items: [{ id: "p1", name: "Headset", price: 50_000, quantity: 1 }],
      referenceId: "ref-1",
      value: 55_000,
    });
    const db = fakeDb({
      results: {
        "orders.select": { data: [order("paid")], error: null },
        "payments.select": {
          data: [{ id: "pay-1", reference_id: "ref-1", status: "paid" }],
          error: null,
        },
      },
    });
    renderScreen(<OrderDetail />, db.supabase);

    expect(
      await screen.findByText(
        "Thank you! We received your payment and are preparing your order."
      )
    ).toBeTruthy();
    expect(track).toHaveBeenCalledWith(
      "purchase",
      expect.objectContaining({ transactionId: "ref-1", value: 55_000 })
    );
  });
});
