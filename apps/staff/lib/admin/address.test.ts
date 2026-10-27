import { expect, test } from "vitest";
import { governorateName, parseAddress } from "./address";

test("parses a shipping address defensively", () => {
  expect(
    parseAddress({
      address: "Street 1",
      full_name: "Ali",
      governorate: "basra",
      phone: "+9647700000000",
    })
  ).toEqual({
    address: "Street 1",
    city: "",
    fullName: "Ali",
    governorate: "basra",
    notes: "",
    phone: "+9647700000000",
  });
  expect(parseAddress(null).fullName).toBe("");
  expect(parseAddress([1, 2]).phone).toBe("");
});

test("governorate names", () => {
  expect(governorateName("basra", "en")).toBe("Basra");
  expect(governorateName("Basra", "ar")).toBe("البصرة");
  expect(governorateName("Atlantis", "en")).toBe("Atlantis");
});
