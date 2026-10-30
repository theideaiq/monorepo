/** A Reloadly API call that failed: its HTTP status and message. */
export class ReloadlyError extends Error {
  readonly status: number;

  constructor(text: string, status: number) {
    super(text);
    this.name = "ReloadlyError";
    this.status = status;
  }
}

export type ReloadlyEnvironment = "production" | "sandbox";

/** An order's outcome: SUCCESSFUL has its codes; PENDING comes later. */
export interface ReloadlyOrder {
  status: "FAILED" | "PENDING" | "PROCESSING" | "REFUNDED" | "SUCCESSFUL";
  transactionId: number;
}

/** A gift card product, as listed by Reloadly. */
export interface ReloadlyProduct {
  brand: { brandName: string } | null;
  country: { isoName: string } | null;
  denominationType: "FIXED" | "RANGE";
  fixedRecipientDenominations: number[];
  fixedSenderDenominations: number[];
  productId: number;
  productName: string;
  recipientCurrencyCode: string;
  redeemInstruction?: { concise?: string | null } | null;
  senderCurrencyCode: string;
}

export interface ReloadlyCard {
  cardNumber: string | null;
  pinCode: string | null;
}

const GIFT_CARDS: Record<ReloadlyEnvironment, string> = {
  production: "https://giftcards.reloadly.com",
  sandbox: "https://giftcards-sandbox.reloadly.com",
};
const AUTH_URL = "https://auth.reloadly.com/oauth/token";
const ACCEPT = "application/com.reloadly.giftcards-v1+json";
// Refresh the token a minute before it expires.
const TOKEN_MARGIN_MS = 60_000;

const message = (body: unknown, fallback: string) =>
  body && typeof body === "object" && "message" in body
    ? String((body as { message: unknown }).message)
    : fallback;

/**
 * The Reloadly gift card API: an OAuth token for the environment's
 * audience (kept until it expires), ordering one card at a time and
 * reading its codes.
 */
export const createReloadlyClient = ({
  clientId,
  clientSecret,
  environment,
  fetcher = fetch,
  now = Date.now,
}: {
  clientId: string;
  clientSecret: string;
  environment: ReloadlyEnvironment;
  fetcher?: typeof fetch;
  now?: () => number;
}) => {
  const base = GIFT_CARDS[environment];
  let token: { expiresAt: number; value: string } | null = null;

  const accessToken = async () => {
    if (token && token.expiresAt > now()) {
      return token.value;
    }
    const response = await fetcher(AUTH_URL, {
      body: JSON.stringify({
        audience: base,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      cache: "no-store",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const body = (await response.json().catch(() => null)) as {
      access_token?: string;
      expires_in?: number;
    } | null;
    if (!(response.ok && body?.access_token)) {
      throw new ReloadlyError(
        message(body, "Reloadly sign-in failed"),
        response.status
      );
    }
    token = {
      expiresAt: now() + (body.expires_in ?? 0) * 1000 - TOKEN_MARGIN_MS,
      value: body.access_token,
    };
    return token.value;
  };

  const call = async <T>(method: string, path: string, body?: unknown) => {
    const response = await fetcher(`${base}${path}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      headers: {
        accept: ACCEPT,
        authorization: `Bearer ${await accessToken()}`,
        "content-type": "application/json",
      },
      method,
    });
    const parsed = (await response.json().catch(() => null)) as T | null;
    if (!response.ok || parsed === null) {
      throw new ReloadlyError(
        message(parsed, `Reloadly ${method} ${path} failed`),
        response.status
      );
    }
    return parsed;
  };

  return {
    /** Codes of a successful order. */
    cards: (transactionId: number) =>
      call<ReloadlyCard[]>(
        "GET",
        `/orders/transactions/${transactionId}/cards`
      ),
    /**
     * Orders one card of a product at its face value. The custom identifier
     * (our code's id) makes a repeated order fail instead of buying twice.
     */
    order: ({
      customIdentifier,
      productId,
      unitPrice,
    }: {
      customIdentifier: string;
      productId: string;
      unitPrice: number;
    }) =>
      call<ReloadlyOrder>("POST", "/orders", {
        customIdentifier,
        productId: Number(productId),
        quantity: 1,
        senderName: "The IDEA",
        unitPrice,
      }),
    /** Every product, page by page. */
    products: async () => {
      const all: ReloadlyProduct[] = [];
      for (let page = 1; page <= 50; page += 1) {
        // biome-ignore lint/performance/noAwaitInLoops: pages are sequential
        const result = await call<{
          content: ReloadlyProduct[];
          totalPages: number;
        }>("GET", `/products?size=200&page=${page}`);
        all.push(...result.content);
        if (page >= result.totalPages) {
          break;
        }
      }
      return all;
    },
  };
};

export type ReloadlyClient = ReturnType<typeof createReloadlyClient>;
