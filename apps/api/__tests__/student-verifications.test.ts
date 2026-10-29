import { describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  env: { NEXT_PUBLIC_WEB_URL: "https://web.example.test" },
}));
vi.mock("@repo/email", () => ({ resend: undefined, sendEmail: vi.fn() }));
vi.mock("@repo/rate-limit", () => ({
  createRateLimiter: vi.fn(),
  slidingWindow: vi.fn(),
}));
vi.mock("@/lib/oidc/signing", () => ({
  issuer: () => "https://api.example.test/oidc",
  signingKey: vi.fn(() => Promise.resolve(null)),
}));

import { signingKey } from "@/lib/oidc/signing";
import {
  deliverWebhooks,
  partnerView,
  verificationError,
} from "@/lib/student-verifications";

const event = {
  attempts: 0,
  client_id: "pass_000000000000000000000001",
  id: "e1",
  payload: { id: "v1", status: "verified" },
  type: "student_verification.updated",
  url: "https://partner.example/hooks",
};

const setup = () => {
  const rpc = vi.fn((name: string) =>
    Promise.resolve(
      name === "claim_partner_webhooks"
        ? { data: [event], error: null }
        : { data: null, error: null }
    )
  );
  return { admin: { rpc } as never, rpc };
};

describe("partnerView", () => {
  it("gives the university and expiry only when verified", () => {
    expect(
      partnerView({
        id: "v1",
        status: "pending",
        university_id: "auib",
        valid_until: "2027-06-30",
      })
    ).toEqual({
      id: "v1",
      status: "pending",
      university: null,
      valid_until: null,
    });
    expect(
      partnerView({
        id: "v1",
        status: "verified",
        university_id: "auib",
        valid_until: "2027-06-30",
      })
    ).toEqual({
      id: "v1",
      status: "verified",
      university: "auib",
      valid_until: "2027-06-30",
    });
  });
});

describe("verificationError", () => {
  it("maps the database's messages", () => {
    expect(verificationError("Use your university email")).toBe(
      "not_university"
    );
    expect(verificationError("Ask for a new code")).toBe("code_expired");
    expect(verificationError("Invalid return address")).toBe(
      "invalid_return_url"
    );
    expect(verificationError("something else")).toBe("failed");
  });
});

describe("deliverWebhooks", () => {
  it("leaves events for later without a signing key", async () => {
    const { admin, rpc } = setup();
    const post = vi.fn();
    expect(await deliverWebhooks(admin, post as never)).toBe(0);
    expect(post).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("finish_partner_webhook", {
      delivered: false,
      error: "signing key not set",
      target: "e1",
    });
  });

  it("posts a signed event and marks it delivered", async () => {
    const { generateKeyPair } = await import("jose");
    const { privateKey } = await generateKeyPair("ES256");
    vi.mocked(signingKey).mockResolvedValueOnce({
      key: privateKey as CryptoKey,
      kid: "k1",
      publicJwk: {},
    } as never);
    const { admin, rpc } = setup();
    const post = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 204 }))
    );
    expect(await deliverWebhooks(admin, post as never)).toBe(1);
    const [url, init] = post.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://partner.example/hooks");
    expect(String(init.body).split(".")).toHaveLength(3);
    expect(rpc).toHaveBeenCalledWith("finish_partner_webhook", {
      delivered: true,
      error: undefined,
      target: "e1",
    });
  });

  it("retries a partner that answers with an error", async () => {
    const { generateKeyPair } = await import("jose");
    const { privateKey } = await generateKeyPair("ES256");
    vi.mocked(signingKey).mockResolvedValueOnce({
      key: privateKey as CryptoKey,
      kid: "k1",
      publicJwk: {},
    } as never);
    const { admin, rpc } = setup();
    const post = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 500 }))
    );
    expect(await deliverWebhooks(admin, post as never)).toBe(0);
    expect(rpc).toHaveBeenCalledWith("finish_partner_webhook", {
      delivered: false,
      error: "HTTP 500",
      target: "e1",
    });
  });
});
