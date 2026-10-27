import { describe, expect, test, vi } from "vitest";
import { corsHeaders, webCorsHeaders, webOrigins } from "../lib/cors";

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://business.theideaiq.com",
    NEXT_PUBLIC_WEB_URL: "https://theideaiq.com",
  },
}));

const from = (origin: string) =>
  new Request("https://api.theideaiq.com/pass/student-code", {
    headers: { origin },
  });

describe("CORS", () => {
  test("the website answers on its bare domain and on www", () => {
    expect([...webOrigins()].sort()).toEqual([
      "https://theideaiq.com",
      "https://www.theideaiq.com",
    ]);
  });

  test("signed-in calls allow both website origins and The IDEA Business", () => {
    for (const origin of [
      "https://theideaiq.com",
      "https://www.theideaiq.com",
      "https://business.theideaiq.com",
    ]) {
      expect(corsHeaders(from(origin))["Access-Control-Allow-Origin"]).toBe(
        origin
      );
    }
    expect(corsHeaders(from("https://evil.example"))).toEqual({});
    expect(corsHeaders(from("https://www.evil.theideaiq.com"))).toEqual({});
  });

  test("public website endpoints allow only the website", () => {
    expect(
      webCorsHeaders(from("https://www.theideaiq.com"))[
        "Access-Control-Allow-Origin"
      ]
    ).toBe("https://www.theideaiq.com");
    expect(
      webCorsHeaders(from("https://business.theideaiq.com"))[
        "Access-Control-Allow-Origin"
      ]
    ).toBeUndefined();
  });
});
