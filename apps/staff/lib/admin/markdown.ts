import { Marked } from "marked";

const HTML_ESCAPES: Record<string, string> = {
  "'": "&#39;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};
const HTML_SPECIAL = /[&<>"']/g;
const SAFE_LINK = /^(https?:|mailto:|tel:|\/|#)/i;
const SAFE_IMAGE = /^https?:/i;

export const escapeHtml = (value: string) =>
  value.replace(HTML_SPECIAL, (char) => HTML_ESCAPES[char] ?? char);

/**
 * Markdown → HTML for previews of posts and submissions.
 * Submissions are written by members, so raw HTML is shown as text, and
 * links and images only keep http(s), mailto, tel and relative URLs.
 */
const markdown = new Marked({
  async: false,
  gfm: true,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    image({ href, text, title }) {
      if (!SAFE_IMAGE.test(href)) {
        return escapeHtml(text);
      }
      const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
      return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttribute} loading="lazy">`;
    },
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      if (!SAFE_LINK.test(href)) {
        return label;
      }
      const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
      return `<a href="${escapeHtml(href)}"${titleAttribute} rel="noopener noreferrer nofollow" target="_blank">${label}</a>`;
    },
  },
});

export const renderMarkdown = (source: string) =>
  markdown.parse(source) as string;
