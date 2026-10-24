import { describe, expect, test } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  test("renders Markdown", () => {
    const html = renderMarkdown("# Title\n\nSome **bold** text.");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });

  test("shows raw HTML as text", () => {
    const html = renderMarkdown(
      '<script>alert("x")</script>\n\nHi <b>there</b>'
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("drops unsafe links and images", () => {
    const html = renderMarkdown(
      "[click](javascript:alert(1)) ![x](data:image/png;base64,AAA) [ok](https://theideaiq.com)"
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:image");
    expect(html).toContain('href="https://theideaiq.com"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  test("escapes attribute values", () => {
    const html = renderMarkdown('[a](https://x.com "t\\"onmouseover=1")');
    expect(html).not.toContain('"onmouseover');
  });
});
