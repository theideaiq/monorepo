import { beforeEach, describe, expect, test, vi } from "vitest";

const WEB = "https://theideaiq.com";
const keys = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://business.theideaiq.com",
    NEXT_PUBLIC_WEB_URL: WEB,
  },
}));
vi.mock("@repo/observability/status/keys", () => ({ keys: () => keys() }));

const { fetchStatus } = await import("@repo/observability/status/server");
const { GET } = await import("../app/status/route");

const monitors = (...states: string[]) =>
  Response.json({
    data: states.map((status) => ({ attributes: { status } })),
  });

describe("fetchStatus", () => {
  beforeEach(() => {
    keys.mockReturnValue({
      BETTERSTACK_API_KEY: "token",
      BETTERSTACK_URL: "https://status.theideaiq.com",
    });
  });

  test("is null without Better Stack", async () => {
    keys.mockReturnValue({});
    expect(await fetchStatus(vi.fn())).toBeNull();
  });

  test("sends the token and sums up the monitors", async () => {
    const fetcher = vi.fn(() => Promise.resolve(monitors("up", "up")));
    expect(await fetchStatus(fetcher as never)).toEqual({
      state: "operational",
      url: "https://status.theideaiq.com",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://uptime.betterstack.com/api/v2/monitors",
      { headers: { Authorization: "Bearer token" } }
    );
    expect(
      (
        await fetchStatus((() =>
          Promise.resolve(monitors("up", "down"))) as never)
      )?.state
    ).toBe("partial");
    expect(
      (await fetchStatus((() => Promise.resolve(monitors("down"))) as never))
        ?.state
    ).toBe("degraded");
  });

  test("reads as unknown when Better Stack can't be reached", async () => {
    const failing = () => Promise.reject(new Error("offline"));
    expect((await fetchStatus(failing as never))?.state).toBe("unknown");
  });
});

describe("GET /status", () => {
  test("answers 204 without Better Stack, with CORS for the website only", async () => {
    keys.mockReturnValue({});
    const response = await GET(
      new Request("http://localhost/status", { headers: { origin: WEB } })
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(WEB);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");

    const other = await GET(
      new Request("http://localhost/status", {
        headers: { origin: "https://evil.example" },
      })
    );
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });
});
