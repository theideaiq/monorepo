import { describe, expect, test } from "vitest";
import { listProducts } from "./catalog";

type Call = [string, ...unknown[]];

/** A Supabase client stand-in that records the query builder calls. */
const fakeClient = (rows: unknown[] = [], categories: unknown[] = []) => {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "or"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.range = (...args: unknown[]) => {
    calls.push(["range", ...args]);
    return Promise.resolve({ data: rows, error: null });
  };
  const client = {
    from: (table: string) => {
      calls.push(["from", table]);
      return table === "product_categories"
        ? { select: () => Promise.resolve({ data: categories, error: null }) }
        : builder;
    },
    rpc: (name: string, args: unknown) => {
      calls.push(["rpc", name, args]);
      return builder;
    },
  };
  return {
    calls,
    client: client as unknown as Parameters<typeof listProducts>[0],
  };
};

describe("listProducts", () => {
  test("searches through the ranked RPC, keeping its order by default", async () => {
    const { calls, client } = fakeClient([{ id: "1" }]);
    const rows = await listProducts(client, {
      category: "vinyl",
      limit: 12,
      offset: 12,
      search: "  أديل  ",
    });
    expect(rows).toEqual([{ id: "1" }]);
    expect(calls[0]).toEqual([
      "rpc",
      "search_products",
      { search_category: "vinyl", search_kind: "sale", search_term: "أديل" },
    ]);
    expect(calls.some(([method]) => method === "order")).toBe(false);
    expect(calls.at(-1)).toEqual(["range", 12, 23]);
  });

  test("a category includes its subcategories", async () => {
    const { calls, client } = fakeClient(
      [],
      [
        { id: "books", parent_id: null, slug: "books" },
        { id: "manga", parent_id: "books", slug: "comics-manga" },
        { id: "games", parent_id: null, slug: "games" },
      ]
    );
    await listProducts(client, { category: "books" });
    expect(calls).toContainEqual(["in", "category_id", ["books", "manga"]]);
    await listProducts(client, { category: "comics-manga" });
    expect(calls).toContainEqual(["in", "category_id", ["manga"]]);
  });

  test("a price sort reorders the search results", async () => {
    const { calls, client } = fakeClient();
    await listProducts(client, { search: "adele", sort: "price-desc" });
    expect(calls).toContainEqual(["order", "price", { ascending: false }]);
  });

  test("caps the search term at 100 characters", async () => {
    const { calls, client } = fakeClient();
    await listProducts(client, { search: "a".repeat(150) });
    const [, , args] = calls[0] as [string, string, { search_term: string }];
    expect(args.search_term).toHaveLength(100);
  });

  test("lists from the table without a search", async () => {
    const { calls, client } = fakeClient();
    await listProducts(client, { search: "   " });
    expect(calls[0]).toEqual(["from", "products"]);
    expect(calls).toContainEqual(["eq", "status", "active"]);
    expect(calls).toContainEqual(["order", "created_at", { ascending: false }]);
  });
});
