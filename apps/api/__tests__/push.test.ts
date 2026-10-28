import { createVerify, generateKeyPairSync } from "node:crypto";
import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { deliverPushNotifications } from "../lib/push/deliver";
import {
  createFcmSender,
  type PushMessage,
  type PushResult,
  type PushSender,
  parseServiceAccount,
  type ServiceAccount,
  signAssertion,
} from "../lib/push/fcm";
import { pushText } from "../lib/push/text";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { format: "pem", type: "pkcs8" },
  publicKeyEncoding: { format: "pem", type: "spki" },
});

const ACCOUNT: ServiceAccount = {
  client_email: "push@the-idea.iam.gserviceaccount.com",
  private_key: privateKey,
  project_id: "the-idea",
  token_uri: "https://oauth2.googleapis.com/token",
};

const U = "00000000-0000-0000-0000-0000000000c1";
const V = "00000000-0000-0000-0000-0000000000c2";

/** A fake transport: records requests and answers from a queue. */
const fakeFetch = (fcmResponses: Response[]) => {
  const calls: { body: string; headers: Headers; url: string }[] = [];
  const impl = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({
      body: String(init?.body ?? ""),
      headers: new Headers(init?.headers),
      url,
    });
    if (url === ACCOUNT.token_uri) {
      return Promise.resolve(
        Response.json({ access_token: "ya29.test", expires_in: 3600 })
      );
    }
    return Promise.resolve(fcmResponses.shift() ?? Response.json({}));
  });
  return { calls, impl: impl as unknown as typeof fetch };
};

describe("parseServiceAccount", () => {
  test("reads the JSON key file, raw or base64", () => {
    const json = JSON.stringify(ACCOUNT);
    expect(parseServiceAccount(json)?.project_id).toBe("the-idea");
    expect(
      parseServiceAccount(Buffer.from(json).toString("base64"))?.client_email
    ).toBe(ACCOUNT.client_email);
  });

  test("defaults the token endpoint", () => {
    const { token_uri: _, ...rest } = ACCOUNT;
    expect(parseServiceAccount(JSON.stringify(rest))?.token_uri).toBe(
      "https://oauth2.googleapis.com/token"
    );
  });

  test("returns null for missing or unusable values", () => {
    expect(parseServiceAccount(undefined)).toBeNull();
    expect(parseServiceAccount("{not json")).toBeNull();
    expect(parseServiceAccount(JSON.stringify({ project_id: "x" }))).toBeNull();
  });
});

describe("signAssertion", () => {
  test("is an RS256 JWT for the FCM scope", () => {
    const jwt = signAssertion(ACCOUNT, 1_700_000_000);
    const [header, claims, signature] = jwt.split(".");
    const decoded = JSON.parse(Buffer.from(claims, "base64url").toString());
    expect(decoded).toMatchObject({
      aud: ACCOUNT.token_uri,
      exp: 1_700_003_600,
      iss: ACCOUNT.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    });
    expect(
      createVerify("RSA-SHA256")
        .update(`${header}.${claims}`)
        .verify(publicKey, Buffer.from(signature, "base64url"))
    ).toBe(true);
  });
});

describe("createFcmSender", () => {
  const message: PushMessage = {
    body: "Open to see the details.",
    data: { link: "/orders" },
    title: "Order delivered",
    token: "device-token-0000000000",
  };

  test("sends an HTTP v1 message with a cached access token", async () => {
    const { calls, impl } = fakeFetch([Response.json({}), Response.json({})]);
    const sender = createFcmSender(ACCOUNT, impl);

    await expect(sender.send(message)).resolves.toBe("sent");
    await expect(sender.send(message)).resolves.toBe("sent");

    const auth = calls.filter(({ url }) => url === ACCOUNT.token_uri);
    const sends = calls.filter(({ url }) => url !== ACCOUNT.token_uri);
    expect(auth).toHaveLength(1);
    expect(sends[0].url).toBe(
      "https://fcm.googleapis.com/v1/projects/the-idea/messages:send"
    );
    expect(sends[0].headers.get("authorization")).toBe("Bearer ya29.test");
    expect(JSON.parse(sends[0].body).message).toMatchObject({
      data: { link: "/orders" },
      notification: { body: message.body, title: message.title },
      token: message.token,
    });
  });

  test("refreshes the access token when it expires", async () => {
    let clock = 0;
    const { calls, impl } = fakeFetch([Response.json({}), Response.json({})]);
    const sender = createFcmSender(ACCOUNT, impl, () => clock);
    await sender.send(message);
    clock = 3600 * 1000;
    await sender.send(message);
    expect(calls.filter(({ url }) => url === ACCOUNT.token_uri)).toHaveLength(
      2
    );
  });

  test("tells unregistered tokens from other failures", async () => {
    const unregistered = Response.json(
      { error: { details: [{ errorCode: "UNREGISTERED" }] } },
      { status: 404 }
    );
    const quota = Response.json(
      { error: { status: "RESOURCE_EXHAUSTED" } },
      { status: 429 }
    );
    const { impl } = fakeFetch([unregistered, quota]);
    const sender = createFcmSender(ACCOUNT, impl);
    await expect(sender.send(message)).resolves.toBe("invalid_token");
    await expect(sender.send(message)).resolves.toBe("failed");
  });

  test("throws when Google refuses the service account", async () => {
    const impl = vi.fn(() =>
      Promise.resolve(new Response("{}", { status: 401 }))
    ) as unknown as typeof fetch;
    await expect(createFcmSender(ACCOUNT, impl).send(message)).rejects.toThrow(
      "FCM auth failed (401)"
    );
  });
});

describe("pushText", () => {
  test("uses the event title in the recipient's language", () => {
    expect(pushText({ event: "order_delivered", kind: "order" }, "en")).toEqual(
      { body: "Open to see the details.", title: "Order delivered" }
    );
    expect(
      pushText({ event: "order_delivered", kind: "order" }, "ar").title
    ).toBe("سُلّم الطلب");
  });

  test("falls back to the kind, then to a notice; Kurdish reads Arabic", () => {
    expect(pushText({ event: "plus_welcome", kind: "plus" }, "en").title).toBe(
      "Plus update"
    );
    expect(pushText({ event: "x", kind: "unknown" }, "en").title).toBe(
      "Notice"
    );
    expect(pushText({ event: "x", kind: "system" }, "ckb").title).toBe("تنبيه");
  });
});

type Claimed =
  Database["public"]["Functions"]["claim_push_notifications"]["Returns"];

/** Admin client stand-in: the claim RPC, a device list and a delete. */
const fakeAdmin = (
  claimed: Claimed,
  devices: { token: string; user_id: string }[]
) => {
  const rpc = vi.fn(() => Promise.resolve({ data: claimed, error: null }));
  const deleteIn = vi.fn(() => Promise.resolve({ error: null }));
  const from = vi.fn(() => ({
    delete: () => ({ in: deleteIn }),
    select: () => ({
      in: () => Promise.resolve({ data: devices, error: null }),
    }),
  }));
  const admin = { from, rpc } as unknown as SupabaseClient<Database>;
  return { admin, deleteIn, from, rpc };
};

const fakeSender = (results: Record<string, PushResult | Error>) => {
  const sent: PushMessage[] = [];
  const sender: PushSender = {
    send: (message) => {
      sent.push(message);
      const result = results[message.token] ?? "sent";
      return result instanceof Error
        ? Promise.reject(result)
        : Promise.resolve(result);
    },
  };
  return { sender, sent };
};

const notification = (
  id: string,
  user_id: string,
  overrides: Partial<Claimed[number]> = {}
): Claimed[number] => ({
  data: {},
  event: "order_shipped",
  id,
  kind: "order",
  link: "/orders/view?id=1",
  locale: "en",
  user_id,
  ...overrides,
});

describe("deliverPushNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("does nothing when there is nothing to push", async () => {
    const { admin, from, rpc } = fakeAdmin([], []);
    const { sender, sent } = fakeSender({});
    await expect(deliverPushNotifications(admin, sender)).resolves.toEqual({
      failed: 0,
      notifications: 0,
      removed: 0,
      sent: 0,
    });
    expect(rpc).toHaveBeenCalledWith("claim_push_notifications", {});
    expect(from).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  test("sends each notification to its recipient's devices only", async () => {
    const { admin, deleteIn, rpc } = fakeAdmin(
      [
        notification("n1", U),
        notification("n2", V, {
          link: null as unknown as string,
          locale: "ar",
        }),
      ],
      [
        { token: "u-phone", user_id: U },
        { token: "u-tablet", user_id: U },
        { token: "v-phone", user_id: V },
      ]
    );
    const { sender, sent } = fakeSender({});

    const summary = await deliverPushNotifications(admin, sender, ["n1", "n2"]);

    expect(rpc).toHaveBeenCalledWith("claim_push_notifications", {
      notification_ids: ["n1", "n2"],
    });
    expect(summary).toEqual({
      failed: 0,
      notifications: 2,
      removed: 0,
      sent: 3,
    });
    expect(sent.map(({ token }) => token).sort()).toEqual([
      "u-phone",
      "u-tablet",
      "v-phone",
    ]);
    expect(sent.find(({ token }) => token === "u-phone")).toMatchObject({
      data: { link: "/orders/view?id=1", notificationId: "n1" },
      title: "Your order is on its way",
    });
    expect(sent.find(({ token }) => token === "v-phone")).toMatchObject({
      data: { notificationId: "n2" },
      title: "طلبك في الطريق",
    });
    expect(deleteIn).not.toHaveBeenCalled();
  });

  test("removes devices FCM no longer knows and counts failures", async () => {
    const { admin, deleteIn } = fakeAdmin(
      [notification("n1", U)],
      [
        { token: "gone", user_id: U },
        { token: "flaky", user_id: U },
        { token: "ok", user_id: U },
      ]
    );
    const { sender } = fakeSender({
      flaky: new Error("network"),
      gone: "invalid_token",
    });

    await expect(deliverPushNotifications(admin, sender)).resolves.toEqual({
      failed: 1,
      notifications: 1,
      removed: 1,
      sent: 1,
    });
    expect(deleteIn).toHaveBeenCalledWith("token", ["gone"]);
  });

  test("surfaces a database error", async () => {
    const admin = {
      rpc: () => Promise.resolve({ data: null, error: { message: "denied" } }),
    } as unknown as SupabaseClient<Database>;
    await expect(
      deliverPushNotifications(admin, fakeSender({}).sender)
    ).rejects.toThrow("denied");
  });
});
