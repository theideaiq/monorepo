import { describe, expect, test, vi } from "vitest";
import { DATA_TIMEOUT_MS, withTimeout } from "@/lib/supabase";

describe("Supabase requests have a time limit", () => {
  test("a request gives up after the limit", () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const signal = withTimeout(undefined);
    expect(timeout).toHaveBeenCalledWith(DATA_TIMEOUT_MS);
    expect(signal.aborted).toBe(false);
    timeout.mockRestore();
  });

  test("the caller can still cancel it sooner", () => {
    const caller = new AbortController();
    const signal = withTimeout(caller.signal);
    caller.abort();
    expect(signal.aborted).toBe(true);
  });

  test("the limit is well under the platform's 300 seconds", () => {
    expect(DATA_TIMEOUT_MS).toBeLessThan(300_000 / 10);
  });
});
