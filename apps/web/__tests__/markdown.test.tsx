import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  localizeHref,
  Markdown,
  markdownToText,
  safeImageUrl,
  safeUrl,
} from "@/lib/markdown";

const render = (source: string, locale?: string) =>
  renderToStaticMarkup(<Markdown locale={locale} source={source} />);

describe("Markdown", () => {
  it("starts the shallowest heading at h2 so no level is skipped", () => {
    const html = renderToStaticMarkup(
      <Markdown source={"## Section\n\nText\n\n### Detail\n\n## Next"} />
    );
    expect(html).toContain("<h2>Section</h2>");
    expect(html).toContain("<h3>Detail</h3>");
    expect(html).toContain("<h2>Next</h2>");
  });

  it("renders headings, emphasis, lists and tables", () => {
    const html = render(
      "# Title\n\nSome **bold** and _italic_.\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |"
    );
    // Document headings start at h2 (the page title is the h1).
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<td");
  });

  it("never renders raw HTML", () => {
    const html = render(
      'Hello <script>alert(1)</script> <img src=x onerror="alert(1)">\n\n<div onclick="x()">block</div>'
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<div onclick");
  });

  it("escapes text", () => {
    expect(render("a &lt; b and 1 < 2")).toContain("1 &lt; 2");
  });

  it("drops unsafe link and image URLs", () => {
    const html = render(
      "[x](javascript:alert(1)) [y](JaVaScRiPt:alert(1)) [z](data:text/html,hi) ![i](javascript:alert(1)) ![h](http://example.com/a.png)"
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:");
    expect(html).not.toContain("<img");
    expect(html).toContain("<span>x</span>");
  });

  it("opens external links safely and keeps safe ones", () => {
    const html = render(
      "[site](https://theideaiq.com) [mail](mailto:hi@theideaiq.com)"
    );
    expect(html).toContain(
      '<a href="https://theideaiq.com" rel="noopener noreferrer" target="_blank">site</a>'
    );
    expect(html).toContain('<a href="mailto:hi@theideaiq.com">mail</a>');
  });

  it("prefixes site-relative links with the locale", () => {
    expect(render("[terms](/legal/terms)", "ar")).toContain(
      'href="/ar/legal/terms"'
    );
    expect(render("[terms](/en/legal/terms)", "ar")).toContain(
      'href="/en/legal/terms"'
    );
  });
});

describe("safeUrl", () => {
  it.each([
    ["https://example.com", "https://example.com"],
    ["mailto:a@b.co", "mailto:a@b.co"],
    ["/ar/store", "/ar/store"],
    ["#section", "#section"],
    ["javascript:alert(1)", null],
    ["java\tscript:alert(1)", null],
    ["  javascript:alert(1)", null],
    ["vbscript:x", null],
    ["//evil.example", null],
    ["", null],
  ])("%s → %s", (input, expected) => {
    expect(safeUrl(input)).toBe(expected);
  });

  it("only allows https images", () => {
    expect(safeImageUrl("https://cdn.example/a.png")).toBe(
      "https://cdn.example/a.png"
    );
    expect(safeImageUrl("http://cdn.example/a.png")).toBeNull();
    expect(safeImageUrl("/local.png")).toBeNull();
  });
});

describe("localizeHref", () => {
  it("leaves external and already localized links alone", () => {
    expect(localizeHref("https://t.me/theideaiq_club", "ar")).toBe(
      "https://t.me/theideaiq_club"
    );
    expect(localizeHref("/ar/store", "en")).toBe("/ar/store");
    expect(localizeHref("/store", undefined)).toBe("/store");
    expect(localizeHref("/store", "en")).toBe("/store");
  });
});

describe("markdownToText", () => {
  it("strips formatting and HTML, and truncates", () => {
    expect(markdownToText("# Hi\n\nSome **bold** <b>x</b> text")).toBe(
      "Hi Some bold x text"
    );
    expect(markdownToText("word ".repeat(100), 20)).toHaveLength(20);
  });
});
