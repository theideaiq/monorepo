import { describe, expect, it } from "vitest";
import { cardSvg, formatMemberNumber } from "./card-svg";

const labels = {
  member: "MEMBER",
  notForScanning: "Not for scanning",
  since: "Member since",
  student: "STUDENT",
};

describe("the card for partner sites", () => {
  it("shows the name, number, plan and badges", () => {
    const svg = cardSvg(
      {
        memberNumber: 1_234_567,
        name: "Sara Ahmed",
        plan: "Glow",
        since: "2026-10",
        student: true,
      },
      labels,
      false
    );
    expect(svg).toContain("Sara Ahmed");
    expect(svg).toContain("№ 1 234 567");
    expect(svg).toContain("Glow  ·  STUDENT");
    expect(svg).toContain("Not for scanning");
    expect(svg.startsWith("<svg")).toBe(true);
  });

  it("escapes what members write", () => {
    const svg = cardSvg(
      {
        memberNumber: null,
        name: '<script>alert("x")</script>&',
        plan: null,
        since: "2026-10",
        student: false,
      },
      labels,
      true
    );
    expect(svg).not.toContain("<script>");
    expect(svg).toContain(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;"
    );
    expect(svg).toContain('direction="rtl"');
  });

  it("groups member numbers by three", () => {
    expect(formatMemberNumber(1000)).toBe("1 000");
    expect(formatMemberNumber(42)).toBe("42");
  });
});
