import type { Database } from "@repo/database";
import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import type { SupabaseClient } from "@supabase/supabase-js";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { fakeDb } from "./fake-db";
import { renderWithApp } from "./render";

vi.mock("@repo/analytics/client", () => ({
  getAttribution: () => ({}),
  resetIdentity: vi.fn(),
  track: vi.fn(),
}));

const TEAM = /^Team$/;

const { Business } = await import("@/components/screens/business");
const { SideMenu } = await import("@/components/side-menu");
const { OrganizationProvider } = await import(
  "@/components/organization-provider"
);

/** The signed-in user is an owner of one organization with `features`. */
const memberOf = (features: string[], role = "owner") => ({
  data: [
    {
      organization: {
        features,
        id: "org-1",
        name: "Rafidain Books",
        slug: "rb",
      },
      role,
    },
  ],
  error: null,
});

/** An approved shop with a line to pack and a listing waiting for a photo. */
const approvedShop = (features: string[]) =>
  fakeDb({
    results: {
      "organization_members.select": memberOf(features),
      "seller_details.select": { data: [], error: null },
      "sellers.select": {
        data: [{ id: "shop-1", name: "Rafidain Books", status: "approved" }],
        error: null,
      },
    },
    rpcs: {
      seller_listings: {
        data: [
          {
            active: true,
            available: 2,
            condition: "used",
            name_ar: "كتاب",
            name_en: "A Book",
            offer_id: "of-1",
            price: 9750,
            product_id: "p-1",
            product_status: "draft",
            sold: 0,
            variant_id: "v-1",
          },
        ],
        error: null,
      },
      seller_order_lines: {
        data: [
          {
            line_id: "l-1",
            name_ar: "أسطوانة",
            name_en: "A Record",
            order_number: "1001",
            ordered_at: new Date().toISOString(),
            quantity: 1,
            ready_by: new Date(Date.now() + 3_600_000).toISOString(),
            status: "waiting",
            unit_price: 19_750,
          },
        ],
        error: null,
      },
      seller_parcels_back: { data: [], error: null },
      seller_returns: { data: [], error: null },
    },
  });

beforeAll(() => {
  // The sidebar asks whether it is on a phone.
  window.matchMedia ??= ((query: string) => ({
    addEventListener: vi.fn(),
    matches: false,
    media: query,
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

const renderScreen = (
  ui: ReactNode,
  supabase: SupabaseClient<Database>,
  locale: "ar" | "en" = "en"
) =>
  renderWithApp(<SidebarProvider>{ui}</SidebarProvider>, { locale, supabase });

describe("business", () => {
  test("Business offers to create or join one", async () => {
    const db = fakeDb({
      results: { "organization_members.select": { data: [], error: null } },
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
      await screen.findByText("Bring your organization to Partners")
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Set up an organization" })
    ).toBeTruthy();
    expect(await screen.findByText("Rafidain Trading")).toBeTruthy();
  });

  test("Today lists the shop's tasks with the action in the row", async () => {
    const db = approvedShop(["selling"]);
    renderScreen(
      <OrganizationProvider>
        <Business />
      </OrganizationProvider>,
      db.supabase
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Today" })
    ).toBeTruthy();
    expect(await screen.findByText("Pack an order")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Pack" }).getAttribute("href")
    ).toBe("/sell/orders");
    expect(screen.getByText("Hidden until it has a photo")).toBeTruthy();
    expect(screen.getByText("Sales this week")).toBeTruthy();
    expect(screen.getByRole("link", { name: "List an item" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Upload a sheet" })).toBeTruthy();
    // Sections not added yet stay below Today.
    expect(screen.getByRole("button", { name: "Add Team" })).toBeTruthy();
  });

  test("the menu greys sections not switched on, with Add", async () => {
    const db = fakeDb({
      results: { "organization_members.select": memberOf([], "member") },
    });
    renderScreen(
      <OrganizationProvider>
        <SideMenu onNavigate={() => undefined} />
      </OrganizationProvider>,
      db.supabase
    );

    const add = await screen.findByRole("link", { name: "Add Selling" });
    expect(add.getAttribute("href")).toBe("/#add-sections");
    expect(screen.getByRole("link", { name: "Add Team" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: TEAM })).toBeNull();
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
  });

  test("Sell is Apply to sell, then the shop's pages with counts", async () => {
    const pending = fakeDb({
      results: {
        "organization_members.select": memberOf(["selling"]),
        "sellers.select": {
          data: [{ id: "shop-1", name: "Rafidain Books", status: "pending" }],
          error: null,
        },
      },
    });
    const first = renderScreen(
      <OrganizationProvider>
        <SideMenu onNavigate={() => undefined} />
      </OrganizationProvider>,
      pending.supabase
    );
    expect(
      (await screen.findByRole("link", { name: "Apply to sell" })).getAttribute(
        "href"
      )
    ).toBe("/sell/settings");
    first.unmount();

    renderScreen(
      <OrganizationProvider>
        <SideMenu onNavigate={() => undefined} />
      </OrganizationProvider>,
      approvedShop(["selling"]).supabase
    );
    expect(
      (await screen.findByRole("link", { name: "Orders" })).getAttribute("href")
    ).toBe("/sell/orders");
    expect(screen.getByRole("link", { name: "Promotions" })).toBeTruthy();
    expect(await screen.findByText("need you")).toBeTruthy();
  });
});
