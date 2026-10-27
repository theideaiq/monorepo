import { describe, expect, it } from "vitest";
import {
  checkDomain,
  fileMatches,
  txtMatches,
  verificationName,
  verificationValue,
} from "./domains";

const TOKEN = "0123456789abcdef0123456789abcdef";

describe("domain verification", () => {
  it("names the TXT record under the domain", () => {
    expect(verificationName("cedar.iq")).toBe("_theidea-pass.cedar.iq");
  });

  it("matches a TXT record, even split in chunks", () => {
    const value = verificationValue(TOKEN);
    expect(txtMatches([["other"], [value]], TOKEN)).toBe(true);
    expect(txtMatches([[value.slice(0, 10), value.slice(10)]], TOKEN)).toBe(
      true
    );
    expect(txtMatches([[verificationValue("f".repeat(32))]], TOKEN)).toBe(
      false
    );
  });

  it("matches the file with the token or the record's value", () => {
    expect(fileMatches(`${TOKEN}\n`, TOKEN)).toBe(true);
    expect(fileMatches(verificationValue(TOKEN), TOKEN)).toBe(true);
    expect(fileMatches(`<html>${TOKEN}</html>`, TOKEN)).toBe(false);
  });

  it("tries DNS, then the file", async () => {
    const urls: string[] = [];
    const using = (records: string[][], body: string | null) => ({
      fetchFile: (url: string) => {
        urls.push(url);
        return Promise.resolve(body);
      },
      txt: () => Promise.resolve(records),
    });
    expect(
      await checkDomain(
        "cedar.iq",
        TOKEN,
        using([[verificationValue(TOKEN)]], null)
      )
    ).toBe("dns");
    expect(await checkDomain("cedar.iq", TOKEN, using([], TOKEN))).toBe("file");
    expect(urls).toEqual([
      "https://cedar.iq/.well-known/theidea-pass-verification.txt",
    ]);
    expect(await checkDomain("cedar.iq", TOKEN, using([], "nope"))).toBeNull();
  });
});
