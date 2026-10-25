import { beforeEach, describe, expect, it, vi } from "vitest";

interface Call {
  args: unknown[];
  method: string;
}

const state: {
  calls: Call[];
  client: boolean;
  result: { data: unknown; error: { message: string } | null };
} = { calls: [], client: true, result: { data: [], error: null } };

/** A chainable stand-in for a PostgREST query that records its calls. */
const builder = (): unknown =>
  new Proxy(
    {},
    {
      get: (_target, method: string) => {
        if (method === "then") {
          return (resolve: (value: unknown) => void) => resolve(state.result);
        }
        return (...args: unknown[]) => {
          state.calls.push({ args, method });
          return builder();
        };
      },
    }
  );

vi.mock("@/lib/supabase", () => ({
  createPublicClient: () =>
    state.client
      ? {
          from: (table: string) => {
            state.calls.push({ args: [table], method: "from" });
            return builder();
          },
          rpc: (name: string, args: unknown) => {
            state.calls.push({ args: [name, args], method: "rpc" });
            return Promise.resolve(state.result);
          },
        }
      : null,
  supabaseUrl: () => "https://db.example.com",
}));

vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn() },
}));

const { getRatings, getRentals, getReviews } = await import("@/lib/data");

beforeEach(() => {
  state.calls = [];
  state.client = true;
  state.result = { data: [], error: null };
});

describe("getRatings", () => {
  it("reads every visible product's rating in one query", async () => {
    state.result = {
      data: [
        { average: 4.5, count: 2, product_id: "a" },
        { average: null, count: 0, product_id: "b" },
      ],
      error: null,
    };
    expect(await getRatings(["a", "b", "a"])).toEqual({
      a: { average: 4.5, count: 2 },
    });
    expect(state.calls.filter((call) => call.method === "from")).toEqual([
      { args: ["product_ratings"], method: "from" },
    ]);
    expect(state.calls).toContainEqual({
      args: ["product_id", ["a", "b"]],
      method: "in",
    });
  });

  it("skips the query for no products", async () => {
    expect(await getRatings([])).toEqual({});
    expect(state.calls).toEqual([]);
  });

  it("degrades to no ratings on errors or without Supabase", async () => {
    state.result = { data: null, error: { message: "boom" } };
    expect(await getRatings(["a"])).toEqual({});
    state.client = false;
    expect(await getRatings(["a"])).toEqual({});
  });
});

describe("getReviews", () => {
  it("lists published reviews through product_review_list", async () => {
    const review = {
      author_name: "Sara",
      comment: "Great",
      created_at: "2026-10-20T09:30:00Z",
      id: "r1",
      rating: 5,
      verified_purchase: true,
    };
    state.result = { data: [review], error: null };
    expect(await getReviews("p1", 10)).toEqual([review]);
    expect(state.calls).toEqual([
      {
        args: ["product_review_list", { max_rows: 10, review_product: "p1" }],
        method: "rpc",
      },
    ]);
  });

  it("returns no reviews when the call fails", async () => {
    state.result = { data: null, error: { message: "boom" } };
    expect(await getReviews("p1")).toEqual([]);
  });
});

describe("getRentals", () => {
  it("selects active rentable products with their plan tier", async () => {
    await getRentals(4);
    const select = state.calls.find((call) => call.method === "select");
    expect(String(select?.args[0]).endsWith(", rental_tier")).toBe(true);
    expect(state.calls).toContainEqual({
      args: ["rentable", true],
      method: "eq",
    });
    expect(state.calls).toContainEqual({
      args: ["status", "active"],
      method: "eq",
    });
    expect(state.calls).toContainEqual({ args: [4], method: "limit" });
  });
});
