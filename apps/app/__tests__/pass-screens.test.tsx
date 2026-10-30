import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Family } from "@/components/pass/family";
import { QueuePage } from "@/components/pass/queue";
import { SettingsList } from "@/components/screens/settings";
import { fakeDb } from "./fake-db";
import { renderWithApp } from "./render";

const SIGN_IN = /Sign-in/;
const NOTIFICATIONS = /Notifications/;

const product = {
  category_id: null,
  compare_at_price: null,
  condition: "new",
  currency: "IQD",
  featured: false,
  id: "p1",
  images: [],
  kind: "sale",
  name_ar: "دون",
  name_en: "Dune",
  price: 20_000,
  rentable: true,
  slug: "dune",
  status: "active",
  stock_count: 1,
  variants: [],
};

describe("the Pass", () => {
  test("Settings lists each section as a page", async () => {
    renderWithApp(<SettingsList />, {
      locale: "en",
      supabase: fakeDb().supabase,
    });
    const link = await screen.findByRole("link", { name: SIGN_IN });
    expect(link.getAttribute("href")).toBe("/pass/settings/sign-in");
    expect(
      screen.getByRole("link", { name: NOTIFICATIONS }).getAttribute("href")
    ).toBe("/pass/settings/notifications");
  });

  test("the queue shows availability and who an item is for", async () => {
    const db = fakeDb({
      results: {
        "family_profiles.select": {
          data: [{ birthday: "2019-05-01", id: "k1", name: "Ali" }],
          error: null,
        },
        "rental_queue_items.select": {
          data: [
            {
              for_profile: "k1",
              for_user: null,
              position: 1,
              product,
              product_id: "p1",
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
        plus_availability: { data: "short", error: null },
      },
    });
    renderWithApp(<QueuePage />, { locale: "en", supabase: db.supabase });
    expect(await screen.findByText("Short wait")).toBeTruthy();
    expect(screen.getByText("For Ali")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Move Dune up" })
        .hasAttribute("disabled")
    ).toBe(true);
  });

  test("a guardian approves a teen's request into their queue", async () => {
    const db = fakeDb({
      results: {
        "family_requests.select": {
          data: [
            {
              created_at: "2027-03-01T10:00:00Z",
              id: "req1",
              product: { ...product },
              product_id: "p1",
              status: "pending",
              teen_id: "t1",
            },
          ],
          error: null,
        },
      },
      rpcs: {
        decide_family_request: { data: null, error: null },
        my_guardian: {
          data: [{ has_birthday: true, minor: false, status: "none" }],
          error: null,
        },
        my_teens: {
          data: [
            {
              allows_plus: true,
              link_id: "l1",
              pending_orders: [],
              teen_name: "Sara",
            },
          ],
          error: null,
        },
      },
    });
    renderWithApp(<Family />, { locale: "en", supabase: db.supabase });
    expect(await screen.findByText("Sara asked for Dune")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add to my queue" }));
    await waitFor(() =>
      expect(db.rpcCalls).toContainEqual({
        args: { approve: true, request: "req1" },
        name: "decide_family_request",
      })
    );
  });

  test("a kid under 13 gets a profile", async () => {
    const db = fakeDb({
      rpcs: {
        add_family_profile: { data: "k1", error: null },
        my_guardian: {
          data: [{ has_birthday: true, minor: false, status: "none" }],
          error: null,
        },
      },
    });
    renderWithApp(<Family />, { locale: "en", supabase: db.supabase });
    fireEvent.change(await screen.findByLabelText("Name"), {
      target: { value: "Ali" },
    });
    fireEvent.change(screen.getByLabelText("Birthday"), {
      target: { value: "2020-04-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add the profile" }));
    await waitFor(() =>
      expect(db.rpcCalls).toContainEqual({
        args: { birthday: "2020-04-01", name: "Ali" },
        name: "add_family_profile",
      })
    );
  });
});
