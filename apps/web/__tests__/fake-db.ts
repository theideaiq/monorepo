import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";

/** One call to a query builder: the table, the operation and its filters. */
export interface QueryCall {
  /** The columns passed to select(), and its options ({ count, head }). */
  columns?: string;
  filters: [string, ...unknown[]][];
  operation: "delete" | "insert" | "select" | "update" | "upsert";
  payload?: unknown;
  selectOptions?: { count?: string; head?: boolean };
  table: string;
}

interface Result {
  /** For select(…, { count: "exact" }). */
  count?: number | null;
  data: unknown;
  error: unknown;
}
type Resolver = Result | ((call: QueryCall) => Result);

const FILTERS = [
  "eq",
  "gt",
  "gte",
  "in",
  "is",
  "limit",
  "lt",
  "neq",
  "or",
  "order",
  "range",
] as const;

/**
 * A Supabase stand-in for screens: `from(table)` builds an awaitable query
 * that resolves to `results["table.operation"]`, `rpc(name, args)` to
 * `rpcs[name]`. Every call is recorded for assertions; a resolver function
 * can answer by the call's columns, filters or select options.
 */
export const fakeDb = ({
  results = {},
  rpcs = {},
  session = {
    access_token: "token",
    user: { id: "user-1", phone: "9647701234567" },
  },
}: {
  results?: Record<string, Resolver>;
  rpcs?: Record<string, Result | ((args: unknown) => Result)>;
  session?: { access_token: string; user: Record<string, unknown> } | null;
} = {}) => {
  const calls: QueryCall[] = [];
  const rpcCalls: { args: unknown; name: string }[] = [];

  const resolve = (call: QueryCall): Result => {
    const resolver = results[`${call.table}.${call.operation}`];
    if (!resolver) {
      return { data: call.operation === "select" ? [] : null, error: null };
    }
    return typeof resolver === "function" ? resolver(call) : resolver;
  };

  const from = vi.fn((table: string) => {
    const call: QueryCall = { filters: [], operation: "select", table };
    let single = false;
    const builder: Record<string, unknown> = {
      // biome-ignore lint/suspicious/noThenProperty: mimics the awaitable builder
      then: (onFulfilled: (value: Result) => unknown) => {
        calls.push(call);
        const result = resolve(call);
        const data =
          single && Array.isArray(result.data)
            ? (result.data[0] ?? null)
            : result.data;
        return Promise.resolve({ ...result, data }).then(onFulfilled);
      },
    };
    for (const operation of ["delete", "insert", "update", "upsert"] as const) {
      builder[operation] = (payload?: unknown) => {
        call.operation = operation;
        call.payload = payload;
        return builder;
      };
    }
    builder.select = (
      columns?: string,
      options?: QueryCall["selectOptions"]
    ) => {
      call.columns = columns;
      call.selectOptions = options;
      return builder;
    };
    builder.single = () => {
      single = true;
      return builder;
    };
    builder.maybeSingle = builder.single;
    for (const filter of FILTERS) {
      builder[filter] = (...args: unknown[]) => {
        call.filters.push([filter, ...args]);
        return builder;
      };
    }
    return builder;
  });

  const rpc = vi.fn((name: string, args?: unknown) => {
    rpcCalls.push({ args, name });
    const result = rpcs[name];
    let answer: Result = { data: null, error: null };
    if (result) {
      answer = typeof result === "function" ? result(args) : result;
    }
    // `.maybeSingle()` / `.single()` take the first row of a set.
    const first = () =>
      Promise.resolve({
        ...answer,
        data: Array.isArray(answer.data)
          ? (answer.data[0] ?? null)
          : answer.data,
      });
    return Object.assign(Promise.resolve(answer), {
      maybeSingle: first,
      single: first,
    });
  });

  const supabase = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      onAuthStateChange: vi.fn(
        (callback: (event: string, value: unknown) => void) => {
          callback("INITIAL_SESSION", session);
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }
      ),
    },
    from,
    rpc,
  } as unknown as SupabaseClient<Database>;

  return { calls, rpc, rpcCalls, supabase };
};

/** The calls made to one table with one operation. */
export const callsTo = (
  calls: readonly QueryCall[],
  table: string,
  operation: QueryCall["operation"]
) =>
  calls.filter((call) => call.table === table && call.operation === operation);

/** Whether a call filtered `column` with `filter` (e.g. "in", "is"). */
export const hasFilter = (call: QueryCall, filter: string, column?: string) =>
  call.filters.some(
    ([name, first]) =>
      name === filter && (column === undefined || first === column)
  );
