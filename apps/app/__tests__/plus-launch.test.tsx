import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { JoinPlus } from "@/components/plus/join-plus";
import { plansFor } from "@/lib/plus-launch";
import { fakeDb } from "./fake-db";
import { renderWithApp } from "./render";

const status = (row: Record<string, unknown>) => ({
  data: [
    {
      can_join: false,
      capacity: 60,
      invite_expires_at: null,
      join_reason: "full",
      places_free: 0,
      waiting: 4,
      waitlist_governorate: null,
      waitlist_position: null,
      waitlist_status: null,
      ...row,
    },
  ],
  error: null,
});

const zones = {
  data: [
    {
      fee: 5000,
      governorate: "baghdad",
      id: "z1",
      name_ar: "بغداد",
      name_en: "Baghdad",
    },
    {
      fee: 7000,
      governorate: "basra",
      id: "z2",
      name_ar: "البصرة",
      name_en: "Basra",
    },
  ],
  error: null,
};

describe("The IDEA Plus launch", () => {
  test("when Plus is full, people join the waitlist", async () => {
    const db = fakeDb({
      results: { "delivery_zones.select": zones },
      rpcs: {
        join_plus_waitlist: { data: 5, error: null },
        plus_status: status({}),
      },
    });
    renderWithApp(<JoinPlus />, { locale: "en", supabase: db.supabase });

    expect(
      await screen.findByText("Plus is full right now; 4 waiting.")
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Join the waitlist" }));
    await waitFor(() =>
      expect(db.rpcCalls).toContainEqual({
        args: { governorate: "baghdad", plan: "" },
        name: "join_plus_waitlist",
      })
    );
  });

  test("someone waiting sees their place", async () => {
    const db = fakeDb({
      rpcs: {
        plus_status: status({
          waitlist_position: 3,
          waitlist_status: "waiting",
        }),
      },
    });
    renderWithApp(<JoinPlus />, { locale: "en", supabase: db.supabase });

    expect(
      await screen.findByText(
        "You're number 3 on the waitlist. We'll let you know when a place opens."
      )
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Leave the waitlist" })
    ).toBeTruthy();
  });

  test("places left are counted in Arabic with Latin digits", async () => {
    const db = fakeDb({
      rpcs: {
        plus_status: status({
          can_join: true,
          join_reason: "open",
          places_free: 3,
        }),
      },
    });
    renderWithApp(<JoinPlus />, { locale: "ar", supabase: db.supabase });

    expect(await screen.findByText("بقيت 3 أماكن")).toBeTruthy();
  });

  test("members don't see the join panel", async () => {
    const db = fakeDb({
      rpcs: { plus_status: status({ can_join: true, join_reason: "member" }) },
    });
    const { container } = renderWithApp(<JoinPlus />, {
      locale: "en",
      supabase: db.supabase,
    });
    await waitFor(() => expect(db.rpcCalls.length).toBeGreaterThan(0));
    expect(container.textContent).toBe("");
  });

  test("plans are shown by billing period", () => {
    const plans = [
      { billing_interval: "month", id: "glow" },
      { billing_interval: "year", id: "glow-year" },
    ];
    expect(plansFor(plans, "year").map((plan) => plan.id)).toEqual([
      "glow-year",
    ]);
    expect(plansFor(undefined, "month")).toEqual([]);
  });
});
