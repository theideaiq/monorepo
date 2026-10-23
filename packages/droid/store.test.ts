import { describe, expect, test, vi } from "vitest";
import { trackFlood } from "./flood";
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

describe("anti-flood", () => {
  const message = (messageId: number, content: string, userId = 1) => ({
    chatId: -100,
    content,
    messageId,
    userId,
  });

  test("trips on the fourth identical message in a row", async () => {
    const store = createMemoryStore();
    expect(await trackFlood(store, message(1, "buy now"))).toBeNull();
    expect(await trackFlood(store, message(2, "buy now"))).toBeNull();
    expect(await trackFlood(store, message(3, " buy now "))).toBeNull();
    expect(await trackFlood(store, message(4, "buy now"))).toEqual([
      1, 2, 3, 4,
    ]);
    // The run starts again afterwards.
    expect(await trackFlood(store, message(5, "buy now"))).toBeNull();
  });

  test("a different message resets the run", async () => {
    const store = createMemoryStore();
    await trackFlood(store, message(1, "hi"));
    await trackFlood(store, message(2, "hi"));
    await trackFlood(store, message(3, "hi"));
    expect(await trackFlood(store, message(4, "hello"))).toBeNull();
    expect(await trackFlood(store, message(5, "hi"))).toBeNull();
  });

  test("counts each person separately", async () => {
    const store = createMemoryStore();
    for (const [id, user] of [
      [1, 1],
      [2, 2],
      [3, 1],
      [4, 2],
      [5, 1],
      [6, 2],
    ] as const) {
      // biome-ignore lint/performance/noAwaitInLoops: order matters
      expect(await trackFlood(store, message(id, "same", user))).toBeNull();
    }
  });

  test("forgets the run after the window", async () => {
    let now = 0;
    const store = createMemoryStore(() => now);
    await trackFlood(store, message(1, "x"));
    await trackFlood(store, message(2, "x"));
    await trackFlood(store, message(3, "x"));
    now = 121_000;
    expect(await trackFlood(store, message(4, "x"))).toBeNull();
  });
});
