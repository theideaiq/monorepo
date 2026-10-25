import type { BoxyOrderRequest } from "./order-request";
import type { BoxyOrder } from "./sync";

/** A Boxy API call that failed: its HTTP status and message. */
export class BoxyError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BoxyError";
    this.status = status;
  }
}

export interface BoxyRegion {
  area_name: string;
  area_name_slug?: string | null;
  province_code: string;
  remote?: boolean | number | null;
  uid: string;
}

export interface CreatedOrder {
  order: BoxyOrder & { fee?: number | null };
}

export type BoxyLabel =
  | { bytes: ArrayBuffer; kind: "pdf" }
  | { kind: "url"; url: string };

interface Envelope<T> {
  message?: string;
  object?: T;
  status?: string;
}

/**
 * The Boxy merchant API: every call sends the key and secret headers and
 * reads the `{ status, code, message, object }` envelope.
 */
export const createBoxyClient = ({
  apiKey,
  apiSecret,
  baseUrl,
  fetcher = fetch,
}: {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  fetcher?: typeof fetch;
}) => {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const send = (method: string, path: string, body?: unknown) =>
    fetcher(new URL(path, base), {
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      headers: {
        accept: "application/json, application/pdf",
        "api-key": apiKey,
        "api-secret": apiSecret,
        "content-type": "application/json",
      },
      method,
    });

  const call = async <T>(method: string, path: string, body?: unknown) => {
    const response = await send(method, path, body);
    const payload = (await response
      .json()
      .catch(() => null)) as Envelope<T> | null;
    if (!response.ok || payload?.status === "fail") {
      throw new BoxyError(
        payload?.message ?? `Boxy answered ${response.status}`,
        response.status
      );
    }
    return payload?.object as T;
  };

  return {
    cancelOrder: (uid: string) =>
      call<null>("POST", `merchants/orders/${encodeURIComponent(uid)}/cancel`),

    createOrder: (request: BoxyOrderRequest) =>
      call<CreatedOrder>("POST", "merchants/orders/request", request),

    getOrder: (uid: string) =>
      call<BoxyOrder>("GET", `merchants/orders/${encodeURIComponent(uid)}`),

    /** The parcel's label: a PDF, or a link to one. */
    label: async (uid: string): Promise<BoxyLabel> => {
      const response = await send(
        "GET",
        `merchants/orders/${encodeURIComponent(uid)}/pick-up-labels`
      );
      if (!response.ok) {
        throw new BoxyError(
          `Boxy answered ${response.status}`,
          response.status
        );
      }
      if (response.headers.get("content-type")?.includes("pdf")) {
        return { bytes: await response.arrayBuffer(), kind: "pdf" };
      }
      const payload = (await response.json().catch(() => null)) as Envelope<
        string | { url?: string }
      > | null;
      const url =
        typeof payload?.object === "string"
          ? payload.object
          : payload?.object?.url;
      if (!url?.startsWith("https://")) {
        throw new BoxyError("Boxy sent no label", 502);
      }
      return { kind: "url", url };
    },

    /** Every area Boxy delivers to, by province. */
    regions: async () => {
      const object = await call<BoxyRegion[] | { items?: BoxyRegion[] } | null>(
        "GET",
        "merchants/regions/provinces"
      );
      return Array.isArray(object) ? object : (object?.items ?? []);
    },

    /** Asks Boxy to collect these parcels; returns the pick-up's uid. */
    requestPickUp: async (uids: string[]) => {
      const pickUps = await call<{ uid: string }[] | null>(
        "POST",
        "merchants/pick-ups/request",
        { order_uids: uids }
      );
      return pickUps?.[0]?.uid ?? null;
    },
  };
};

export type BoxyClient = ReturnType<typeof createBoxyClient>;
