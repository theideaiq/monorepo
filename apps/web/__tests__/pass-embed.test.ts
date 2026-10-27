import { describe, expect, it } from "vitest";
import {
  embedClientId,
  embedTheme,
  heightMessage,
  isEmbedConnectPath,
  isEmbedPath,
  isEmbedRequestPath,
  isEmbedSignIn,
  isEmbedTokenMessage,
  originAllowed,
} from "@/lib/pass-embed";

const client = "pass_0123456789abcdef01234567";

describe("the live card embed", () => {
  it("knows its paths", () => {
    expect(isEmbedPath("/pass/embed")).toBe(true);
    expect(isEmbedPath("/pass/embed/connect")).toBe(true);
    expect(isEmbedPath("/pass/embedded")).toBe(false);
    expect(isEmbedPath("/pass")).toBe(false);
    expect(isEmbedRequestPath("/ar/pass/embed")).toBe(true);
    expect(isEmbedConnectPath("/ar/pass/embed/connect")).toBe(true);
    expect(isEmbedConnectPath("/pass/embed")).toBe(false);
  });

  it("takes only a real client id and theme", () => {
    expect(embedClientId(client)).toBe(client);
    expect(embedClientId("pass_x")).toBeNull();
    expect(embedClientId(null)).toBeNull();
    expect(embedTheme("dark")).toBe("dark");
    expect(embedTheme("blue")).toBeNull();
  });

  it("is framed only by the app's domains", () => {
    const allowed = ["https://*.auibsal.org", "https://auibsal.org"];
    expect(originAllowed("https://auibsal.org", allowed)).toBe(true);
    expect(originAllowed("https://www.auibsal.org", allowed)).toBe(true);
    expect(originAllowed("https://evilauibsal.org", allowed)).toBe(false);
    expect(originAllowed("http://auibsal.org", allowed)).toBe(false);
    expect(originAllowed("https://auibsal.org.evil.com", allowed)).toBe(false);
    expect(originAllowed(null, allowed)).toBe(false);
  });

  it("accepts only its own token message", () => {
    const token = "a".repeat(64);
    expect(
      isEmbedTokenMessage(
        { clientId: client, token, type: "idea-pass-embed-token" },
        client
      )
    ).toBe(true);
    expect(
      isEmbedTokenMessage(
        { clientId: "pass_other", token, type: "idea-pass-embed-token" },
        client
      )
    ).toBe(false);
    expect(
      isEmbedTokenMessage(
        { clientId: client, token: "x", type: "idea-pass-embed-token" },
        client
      )
    ).toBe(false);
    expect(isEmbedTokenMessage("hello", client)).toBe(false);
  });

  it("tells the page only its height", () => {
    expect(heightMessage(311.2)).toEqual({
      height: 312,
      type: "idea-pass-card",
    });
  });
});

describe("signing in inside the connect popup", () => {
  it("keeps the popup's link only for the embed", () => {
    const back = "/pass/embed/connect?client_id=pass_0123456789abcdef01234567";
    expect(isEmbedSignIn("/sign-in", back)).toBe(true);
    expect(isEmbedSignIn("/ar/mfa", `/ar${back}`)).toBe(true);
    expect(isEmbedSignIn("/sign-in", "/pass")).toBe(false);
    expect(isEmbedSignIn("/sign-in", null)).toBe(false);
    expect(isEmbedSignIn("/pass", back)).toBe(false);
  });
});
