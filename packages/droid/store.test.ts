import { describe, expect, test, vi } from "vitest";
import { createMemoryStore, createUpstashStore } from "./store";

describe("memory store", () => {
  test("expires keys after their TTL", async () => {
    let now = 0;
    const store = createMemoryStore(() => now);
    await store.set("a", { value: 1 }, 10);
    expect(await store.get("a")).toEqual({ value: 1 });
    now = 10_001;
    expect(await store.get("a")).toBeUndefined();
  });

  test("counters keep their first expiry", async () => {
    let now = 0;
    const store = createMemoryStore(() => now);
    expect(await store.increment("c", 5)).toBe(1);
    now = 4000;
    expect(await store.increment("c", 5)).toBe(2);
    now = 5001;
    expect(await store.increment("c", 5)).toBe(1);
  });

  test("deletes keys", async () => {
    const store = createMemoryStore();
    await store.set("a", "x", 60);
    await store.delete("a");
    expect(await store.get("a")).toBeUndefined();
  });
});

describe("Upstash store", () => {
  test("prefixes keys and sets expiries", async () => {
    const redis = {
      del: vi.fn(async () => 1),
      expire: vi.fn(async () => 1),
      get: vi.fn(async () => null),
      incr: vi.fn(async () => 1),
      set: vi.fn(async () => "OK"),
    };
    const store = createUpstashStore(redis as never);

    await store.set("k", { a: 1 }, 30);
    expect(redis.set).toHaveBeenCalledWith("droid:k", { a: 1 }, { ex: 30 });
    expect(await store.get("k")).toBeUndefined();
    expect(await store.increment("n", 60)).toBe(1);
    expect(redis.expire).toHaveBeenCalledWith("droid:n", 60);
    await store.delete("k");
    expect(redis.del).toHaveBeenCalledWith("droid:k");
  });
});
