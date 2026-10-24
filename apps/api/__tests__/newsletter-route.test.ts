import { beforeEach, describe, expect, test, vi } from "vitest";

const CRON = "c".repeat(64);
const env: Record<string, string | undefined> = {
  CRON_SECRET: CRON,
  RESEND_SEGMENT_ID: "seg_1",
};
const sync = vi.fn();

vi.mock("@/env", () => ({ env }));
vi.mock("@repo/email", () => ({ resend: { contacts: {} } }));
vi.mock("@repo/database/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/newsletter", () => ({
  syncNewsletterContacts: (...args: unknown[]) => sync(...args),
}));

const route = await import("../app/cron/newsletter-contacts/route");

describe("GET /cron/newsletter-contacts", () => {
  const get = (authorization?: string) =>
    new Request("https://api.theideaiq.com/cron/newsletter-contacts", {
      headers: authorization ? { Authorization: authorization } : {},
    });

  beforeEach(() => {
    sync.mockReset();
    env.RESEND_SEGMENT_ID = "seg_1";
  });

  test("needs the cron secret", async () => {
    expect((await route.GET(get())).status).toBe(401);
    expect((await route.GET(get("Bearer nope"))).status).toBe(401);
    expect(sync).not.toHaveBeenCalled();
  });

  test("is off without a segment", async () => {
    env.RESEND_SEGMENT_ID = undefined;
    const response = await route.GET(get(`Bearer ${CRON}`));
    expect(await response.json()).toEqual({
      ok: true,
      skipped: "not_configured",
    });
    expect(sync).not.toHaveBeenCalled();
  });

  test("runs the sync", async () => {
    sync.mockResolvedValue({ failed: 0, pushed: 3 });
    const response = await route.GET(get(`Bearer ${CRON}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ failed: 0, ok: true, pushed: 3 });
    expect(sync).toHaveBeenCalledWith(
      expect.objectContaining({ segmentId: "seg_1" })
    );
  });

  test("reports failures", async () => {
    sync.mockRejectedValue(new Error("boom"));
    expect((await route.GET(get(`Bearer ${CRON}`))).status).toBe(500);
  });
});
