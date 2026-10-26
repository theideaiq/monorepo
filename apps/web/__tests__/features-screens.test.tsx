import type { Database } from "@repo/database";
import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { callsTo, fakeDb, hasFilter, type QueryCall } from "./fake-db";
import { renderWithApp } from "./render";
import { router, searchParams } from "./setup";

vi.mock("@repo/analytics/client", () => ({
  getAttribution: () => ({}),
  resetIdentity: vi.fn(),
  track: vi.fn(),
}));

const { PurchasePanel } = await import("@/components/store/purchase-panel");
const { WriteReview } = await import("@/components/store/product-reviews");
const { Wishlist } = await import("@/components/screens/wishlist");
const { NewTicket } = await import("@/components/screens/new-ticket");
const { Ticket } = await import("@/components/screens/ticket");
const { YourPlus } = await import("@/components/screens/plus");
const { NotificationBell } = await import("@/components/notification-bell");

const USER_ID = "user-1";
const HIDDEN_NOTE = /Our team hid this review/;

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    addEventListener: vi.fn(),
    matches: false,
    media: query,
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  // Radix Select and Popover measure and scroll elements jsdom lacks.
  Element.prototype.scrollIntoView ??= vi.fn();
  Element.prototype.hasPointerCapture ??= vi.fn(() => false);
  Element.prototype.releasePointerCapture ??= vi.fn();
});

afterEach(() => {
  router.push.mockClear();
  router.replace.mockClear();
});

const renderScreen = (ui: ReactNode, supabase: SupabaseClient<Database>) =>
  renderWithApp(<SidebarProvider>{ui}</SidebarProvider>, {
    locale: "en",
    supabase,
  });

const product = {
  category: null,
  compare_at_price: null,
  condition: "new",
  currency: "IQD",
  description_ar: null,
  description_en: null,
  details: {},
  id: "p1",
  images: [],
  kind: "sale",
  name_ar: "سماعة",
  name_en: "Headset",
  price: 50_000,
  product_variants: [
    {
      active: true,
      attributes: {},
      compare_at_price: null,
      id: "v0",
      label_ar: null,
      label_en: null,
      price: 50_000,
      sku: null,
      stock_count: 4,
    },
  ],
  rental_tier: null,
  seller: "Baghdad Games",
  slug: "headset",
  status: "active",
  stock_count: 4,
  verified: true,
};

describe("product page actions", () => {
  const setup = (
    myReview: object | null = null,
    results: Record<string, { data: unknown; error: unknown }> = {}
  ) =>
    fakeDb({
      results: {
        "product_ratings.select": {
          data: [{ average: 4.3, count: 12, product_id: "p1" }],
          error: null,
        },
        "product_reviews.select": {
          data: myReview ? [myReview] : [],
          error: null,
        },
        "products.select": { data: [product], error: null },
        ...results,
      },
    });

  test("writes a review, asking for a rating first", async () => {
    const db = setup();
    renderScreen(<WriteReview productId="p1" />, db.supabase);

    fireEvent.click(
      await screen.findByRole("button", { name: "Publish review" })
    );
    expect(
      await screen.findByText("Choose a rating from 1 to 5 stars.")
    ).toBeTruthy();

    fireEvent.click(screen.getByLabelText("4 out of 5 stars"));
    fireEvent.change(screen.getByLabelText("Your review (optional)"), {
      target: { value: "  Great sound.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish review" }));

    await waitFor(() =>
      expect(callsTo(db.calls, "product_reviews", "insert")).toHaveLength(1)
    );
    expect(callsTo(db.calls, "product_reviews", "insert")[0]?.payload).toEqual({
      comment: "Great sound.",
      photos: [],
      product_id: "p1",
      rating: 4,
      user_id: USER_ID,
    });
  });

  test("shows the user's own review even when staff hid it", async () => {
    const db = setup({
      comment: "Not great.",
      created_at: "2026-11-03T10:00:00Z",
      id: "mine",
      rating: 2,
      status: "hidden",
      verified_purchase: false,
    });
    renderScreen(<WriteReview productId="p1" />, db.supabase);

    expect(await screen.findByText("Your review")).toBeTruthy();
    expect(screen.getByText("Not great.")).toBeTruthy();
    expect(screen.getByText(HIDDEN_NOTE)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByLabelText("5 out of 5 stars"));
    fireEvent.click(screen.getByRole("button", { name: "Publish review" }));
    await waitFor(() =>
      expect(callsTo(db.calls, "product_reviews", "update")).toHaveLength(1)
    );
    const [update] = callsTo(db.calls, "product_reviews", "update");
    expect(update?.payload).toEqual({
      comment: "Not great.",
      photos: [],
      rating: 5,
    });
    expect(update?.filters).toContainEqual(["eq", "id", "mine"]);
  });

  test("saves the product to the wishlist", async () => {
    const db = setup();
    renderScreen(
      <PurchasePanel
        product={
          product as unknown as Parameters<typeof PurchasePanel>[0]["product"]
        }
      />,
      db.supabase
    );

    fireEvent.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(callsTo(db.calls, "wishlist_items", "insert")[0]?.payload).toEqual(
        { product_id: "p1", user_id: USER_ID }
      )
    );
  });
});

describe("wishlist", () => {
  test("moves an item to the cart and removes it from the wishlist", async () => {
    const db = fakeDb({
      results: {
        "wishlist_items.select": {
          data: [
            {
              created_at: "2026-11-03T10:00:00Z",
              product: {
                ...product,
                category_id: null,
                featured: false,
                variants: product.product_variants,
              },
              product_id: "p1",
            },
            {
              created_at: "2026-11-02T10:00:00Z",
              product: {
                ...product,
                id: "p2",
                name_en: "Controller",
                slug: "controller",
                variants: [
                  { active: true, id: "v1", price: 50_000 },
                  { active: true, id: "v2", price: 60_000 },
                ],
              },
              product_id: "p2",
            },
          ],
          error: null,
        },
      },
    });
    renderScreen(<Wishlist />, db.supabase);

    expect(
      await screen.findByRole("link", { name: "Choose options" })
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Move to cart" }));

    await waitFor(() =>
      expect(callsTo(db.calls, "wishlist_items", "delete")).toHaveLength(1)
    );
    expect(callsTo(db.calls, "cart_items", "insert")[0]?.payload).toEqual({
      condition: null,
      product_id: "p1",
      quantity: 1,
      user_id: USER_ID,
      variant_id: "v0",
    });
    expect(callsTo(db.calls, "wishlist_items", "delete")[0]?.filters).toEqual([
      ["eq", "user_id", USER_ID],
      ["eq", "product_id", "p1"],
    ]);
  });

  test("an empty wishlist points to the store", async () => {
    const db = fakeDb();
    renderScreen(<Wishlist />, db.supabase);
    expect(await screen.findByText("Your wishlist is empty")).toBeTruthy();
  });
});

describe("support", () => {
  const ticket = (status = "open") => ({
    created_at: "2026-11-03T10:00:00Z",
    id: "t1",
    last_message_at: "2026-11-03T12:00:00Z",
    number: 1001,
    order: { id: "o1", number: 10_001 },
    order_id: "o1",
    status,
    subject: "Late delivery",
    topic: "order",
  });

  test("opens a ticket about an order from the order page", async () => {
    searchParams.current = new URLSearchParams("topic=order&order=o1");
    const db = fakeDb({
      results: {
        "orders.select": {
          data: [
            {
              created_at: "2026-11-02T10:00:00Z",
              id: "o1",
              number: 10_001,
              order_items: [],
              status: "paid",
            },
          ],
          error: null,
        },
      },
      rpcs: { create_support_ticket: { data: ticket(), error: null } },
    });
    renderScreen(<NewTicket />, db.supabase);

    fireEvent.click(
      await screen.findByRole("button", { name: "Send request" })
    );
    expect(await screen.findByText("Enter a subject.")).toBeTruthy();
    expect(screen.getByText("Write your message.")).toBeTruthy();
    expect(db.rpc).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Late delivery" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "My order hasn't arrived." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() =>
      expect(db.rpcCalls).toContainEqual({
        args: {
          ticket_body: "My order hasn't arrived.",
          ticket_order: "o1",
          ticket_subject: "Late delivery",
          ticket_topic: "order",
        },
        name: "create_support_ticket",
      })
    );
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/help/t1")
    );
  });

  test("shows the conversation, replies and closes the ticket", async () => {
    const db = fakeDb({
      results: {
        "support_messages.select": {
          data: [
            {
              author_id: USER_ID,
              body: "My order hasn't arrived.",
              created_at: "2026-11-03T10:00:00Z",
              id: "m1",
            },
            {
              author_id: "staff-1",
              body: "It ships today.",
              created_at: "2026-11-03T12:00:00Z",
              id: "m2",
            },
          ],
          error: null,
        },
        "support_tickets.select": { data: [ticket("pending")], error: null },
      },
      rpcs: { close_support_ticket: { data: null, error: null } },
    });
    renderScreen(<Ticket ticketId="t1" />, db.supabase);

    expect(await screen.findByText("It ships today.")).toBeTruthy();
    expect(screen.getByText("The IDEA support")).toBeTruthy();
    expect(screen.getByText("You")).toBeTruthy();
    expect(screen.getByText("Awaiting customer")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Order #10001" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Reply"), {
      target: { value: "Thanks!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
    await waitFor(() =>
      expect(
        callsTo(db.calls, "support_messages", "insert")[0]?.payload
      ).toEqual({ author_id: USER_ID, body: "Thanks!", ticket_id: "t1" })
    );

    fireEvent.click(screen.getByRole("button", { name: "Close ticket" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Close ticket" })
    );
    await waitFor(() =>
      expect(db.rpcCalls).toContainEqual({
        args: { ticket: "t1" },
        name: "close_support_ticket",
      })
    );
  });

  test("a closed ticket takes no replies", async () => {
    const db = fakeDb({
      results: {
        "support_tickets.select": { data: [ticket("closed")], error: null },
      },
    });
    renderScreen(<Ticket ticketId="t1" />, db.supabase);

    const reply = (await screen.findByLabelText(
      "Reply"
    )) as HTMLTextAreaElement;
    expect(reply.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Send reply" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(screen.queryByRole("button", { name: "Close ticket" })).toBeNull();
  });
});

describe("notifications", () => {
  const isCount = (call: QueryCall) => Boolean(call.selectOptions?.head);

  test("counts unread, lists, opens and marks read", async () => {
    const db = fakeDb({
      results: {
        "notifications.select": (call) =>
          isCount(call)
            ? { count: 2, data: null, error: null }
            : {
                data: [
                  {
                    created_at: "2026-11-03T10:00:00Z",
                    data: { number: 10_001, tracking: "IQ123" },
                    event: "order_shipped",
                    id: "n1",
                    kind: "order",
                    link: "/orders/view?id=o1",
                    read_at: null,
                  },
                  {
                    created_at: "2026-11-02T10:00:00Z",
                    data: {},
                    event: "something_new",
                    id: "n2",
                    kind: "system",
                    link: null,
                    read_at: "2026-11-02T11:00:00Z",
                  },
                ],
                error: null,
              },
      },
      rpcs: { mark_notifications_read: { data: 1, error: null } },
    });
    renderScreen(<NotificationBell />, db.supabase);

    const bell = await screen.findByRole("button", {
      name: "Notifications, 2 unread",
    });
    const countCall = callsTo(db.calls, "notifications", "select").find(
      isCount
    );
    expect(countCall && hasFilter(countCall, "is", "read_at")).toBe(true);

    fireEvent.click(bell);
    expect(await screen.findByText("Your order is on its way")).toBeTruthy();
    expect(
      screen.getByText("Order #10001 has shipped. Tracking number: IQ123.")
    ).toBeTruthy();
    // Unknown events still read well.
    expect(screen.getByText("Notice")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    await waitFor(() =>
      expect(db.rpcCalls).toContainEqual({
        args: {},
        name: "mark_notifications_read",
      })
    );

    fireEvent.click(screen.getByText("Your order is on its way"));
    await waitFor(() =>
      expect(db.rpcCalls).toContainEqual({
        args: { notification_ids: ["n1"] },
        name: "mark_notifications_read",
      })
    );
    expect(router.push).toHaveBeenCalledWith("/pass/orders/o1");
  });
});

describe("The IDEA Plus tiers", () => {
  test("names the plan an item needs and blocks lower tiers", async () => {
    const rental = {
      category_id: null,
      compare_at_price: null,
      condition: "used",
      currency: "IQD",
      featured: false,
      images: [],
      kind: "rental",
      price: 0,
      stock_count: 2,
    };
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
              features_en: [],
              id: "plus-1",
              name: "Plus",
              rental_slots: 2,
              tier: 1,
            },
            {
              amount: 25_000,
              billing_interval: "month",
              currency: "IQD",
              description: null,
              features_ar: [],
              features_en: [],
              id: "plus-2",
              name: "Plus Extra",
              rental_slots: 4,
              tier: 2,
            },
          ],
          error: null,
        },
        "products.select": (call) =>
          hasFilter(call, "in", "id")
            ? {
                data: [
                  { id: "r1", rental_tier: 2 },
                  { id: "r2", rental_tier: null },
                ],
                error: null,
              }
            : {
                data: [
                  {
                    ...rental,
                    id: "r1",
                    name_ar: "لعبة",
                    name_en: "Elden Ring",
                    slug: "elden-ring",
                  },
                  {
                    ...rental,
                    id: "r2",
                    name_ar: "كتاب",
                    name_en: "A book",
                    slug: "a-book",
                  },
                ],
                error: null,
              },
        "subscriptions.select": {
          data: [
            {
              cancel_at_period_end: false,
              current_period_end: "2099-01-01T00:00:00Z",
              id: "s1",
              plan_id: "plus-1",
              status: "active",
            },
          ],
          error: null,
        },
      },
      rpcs: {
        my_rental_allowance: {
          data: [{ in_use: 0, slots: 2, tier: 1 }],
          error: null,
        },
        request_rental: {
          data: null,
          error: { code: "23514", message: "This item needs a higher plan" },
        },
      },
    });
    renderScreen(<YourPlus />, db.supabase);

    expect(await screen.findByText("Needs Plus Extra")).toBeTruthy();
    expect(
      await screen.findByText("Upgrade to Plus Extra to rent this item.")
    ).toBeTruthy();
    const [locked, open] = screen.getAllByRole("button", { name: "Request" });
    expect((locked as HTMLButtonElement).disabled).toBe(true);
    expect((open as HTMLButtonElement).disabled).toBe(false);
  });
});
