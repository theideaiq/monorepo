import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DuoInvite, DuoPanel } from "@/components/plus/duo";
import {
  duoErrorKey,
  duoInvitePath,
  isDuoPartner,
  sharesSwaps,
  toMyDuo,
} from "@/lib/duo";
import { soloPlans } from "@/lib/plus";
import { plansFor } from "@/lib/plus-launch";
import { fakeDb } from "./fake-db";
import { renderWithApp } from "./render";

const SHARES_HUDAS = /You share Huda's Plus/;

const duo = (row: Record<string, unknown>) => ({
  data: {
    ends_at: null,
    has_home: true,
    holder_name: "Huda",
    invite_expires_at: null,
    invite_token: null,
    joined_at: null,
    partner_name: null,
    partner_status: null,
    plan_id: "plus-shine-duo",
    role: "holder",
    swap_date: null,
    swap_order: "alternate",
    ...row,
  },
  error: null,
});

describe("Plus Duo", () => {
  test("my_duo() becomes a typed object, or null off a Duo", () => {
    expect(toMyDuo(null)).toBeNull();
    expect(toMyDuo([])).toBeNull();
    const mine = toMyDuo(
      duo({ partner_name: "Peri", partner_status: "joined", role: "partner" })
        .data
    );
    expect(mine).toMatchObject({
      holderName: "Huda",
      partnerName: "Peri",
      planId: "plus-shine-duo",
      role: "partner",
      swapOrder: "alternate",
    });
    expect(sharesSwaps(mine)).toBe(true);
    expect(isDuoPartner(mine)).toBe(true);
    expect(
      isDuoPartner({ ...(mine ?? {}), partnerStatus: "guardian" } as never)
    ).toBe(false);
  });

  test("errors and links", () => {
    expect(duoErrorKey(new Error("You already have Plus"))).toBe("alreadyPlus");
    expect(duoErrorKey(new Error("This invite has expired"))).toBe("expired");
    expect(duoErrorKey(new Error("Their rentals must be returned first"))).toBe(
      "rentalsOut"
    );
    expect(duoErrorKey(new Error("boom"))).toBe("failed");
    expect(duoInvitePath("a/b")).toBe("/family/a%2Fb");
  });

  test("Duo plans are listed apart from the plans for one person", () => {
    const plans = [
      { billing_interval: "month", duo: false, id: "glow" },
      { billing_interval: "month", duo: true, id: "glow-duo" },
      { billing_interval: "year", duo: true, id: "glow-duo-year" },
    ];
    expect(plansFor(plans, "month").map((plan) => plan.id)).toEqual(["glow"]);
    expect(plansFor(plans, "month", true).map((plan) => plan.id)).toEqual([
      "glow-duo",
    ]);
    expect(soloPlans(plans).map((plan) => plan.id)).toEqual(["glow"]);
  });

  test("the holder invites someone", async () => {
    const db = fakeDb({
      rpcs: {
        invite_duo_partner: { data: { id: "m1" }, error: null },
        my_duo: duo({}),
      },
    });
    renderWithApp(<DuoPanel />, { locale: "en", supabase: db.supabase });
    fireEvent.click(
      await screen.findByRole("button", { name: "Invite someone" })
    );
    await waitFor(() =>
      expect(db.rpcCalls.map((call) => call.name)).toContain(
        "invite_duo_partner"
      )
    );
  });

  test("the second person sees whose Plus it is and can leave", async () => {
    const db = fakeDb({
      rpcs: {
        leave_duo: { data: null, error: null },
        my_duo: duo({
          joined_at: "2026-10-30T10:00:00Z",
          partner_name: "Peri",
          partner_status: "joined",
          role: "partner",
        }),
      },
    });
    renderWithApp(<DuoPanel />, { locale: "en", supabase: db.supabase });
    expect(await screen.findByText(SHARES_HUDAS)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Leave the Duo" }));
    const buttons = await screen.findAllByRole("button", {
      name: "Leave the Duo",
    });
    fireEvent.click(buttons[0] as HTMLElement);
    await waitFor(() =>
      expect(db.rpcCalls.map((call) => call.name)).toContain("leave_duo")
    );
  });

  test("an invite shows who sent it and joins", async () => {
    const db = fakeDb({
      results: { "plans.select": { data: [], error: null } },
      rpcs: {
        accept_duo_invite: {
          data: { guardian_status: null, id: "m1" },
          error: null,
        },
        duo_invite: {
          data: [
            {
              expires_at: "2026-11-06T00:00:00Z",
              holder_name: "Huda",
              open: true,
              plan_id: "plus-shine-duo",
              plan_name: "Plus Shine Duo",
              plan_name_ar: "ايديا پلص Shine Duo",
              tier: 2,
            },
          ],
          error: null,
        },
      },
    });
    renderWithApp(<DuoInvite token="code-1" />, {
      locale: "en",
      supabase: db.supabase,
    });
    expect(
      await screen.findByText("Huda invites you to share their Plus Shine Duo.")
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(
      await screen.findByText("You're in. You now share Huda's Plus.")
    ).toBeTruthy();
  });
});
