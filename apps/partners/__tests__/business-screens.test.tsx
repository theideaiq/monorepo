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

const { Business } = await import("@/components/screens/business");
const { OrganizationProvider } = await import(
  "@/components/organization-provider"
);

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
      await screen.findByText("Bring your organization to Partners")
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Set up an organization" })
    ).toBeTruthy();
    expect(await screen.findByText("Rafidain Trading")).toBeTruthy();
  });
});
