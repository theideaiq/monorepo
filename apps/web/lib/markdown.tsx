import type {
  Nodes,
  Parent,
  PhrasingContent,
  Root,
  RootContent,
  TableRow,
} from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import type { ReactNode } from "react";

/**
 * Safe Markdown rendering for posts, events and legal documents.
 *
 * Markdown (with GitHub tables, strikethrough, task lists and autolinks) is
 * parsed into a syntax tree and turned into React elements directly, so text
 * is always escaped by React. Raw HTML in the source is dropped, never
 * injected, and links and images only keep safe URLs.
 */

export const parseMarkdown = (source: string): Root =>
  fromMarkdown(source, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
// Relative URLs ("/ar/store", "#section", "page"), but not "//host" or
// anything with a scheme.
const RELATIVE = /^(?:[/#?](?!\/)|[\w.-]+(?:[/?#]|$))/;
// Control characters and whitespace browsers ignore inside a scheme.
const IGNORED_IN_SCHEME = /[\u0000- \u007f]/g;

/** The URL if it is safe to link to, otherwise null. */
export const safeUrl = (url: string | null | undefined): string | null => {
  if (!url) {
    return null;
  }
  const trimmed = url.trim();
  const compact = trimmed.replace(IGNORED_IN_SCHEME, "");
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(compact);
  if (scheme) {
    return SAFE_PROTOCOLS.has(`${scheme[1]?.toLowerCase()}:`) ? trimmed : null;
  }
  return RELATIVE.test(compact) ? trimmed : null;
};

/** Images may only come from https URLs (the CSP narrows hosts further). */
export const safeImageUrl = (url: string | null | undefined) => {
  const safe = safeUrl(url);
  return safe?.toLowerCase().startsWith("https://") ? safe : null;
};

const isExternal = (url: string) => /^https?:\/\//i.test(url);

/** Plain text of a Markdown document, e.g. for meta descriptions. */
export const markdownToText = (source: string, maxLength = 200) => {
  const parts: string[] = [];
  const walk = (node: Nodes) => {
    if (node.type === "text" || node.type === "inlineCode") {
      parts.push(node.value);
    } else if (node.type !== "html" && "children" in node) {
      for (const child of node.children) {
        walk(child);
      }
      if (node.type === "paragraph" || node.type === "heading") {
        parts.push(" ");
      }
    }
  };
  walk(parseMarkdown(source));
  const text = parts.join("").replace(/\s+/g, " ").trim();
  return text.length > maxLength
    ? `${text.slice(0, maxLength - 1).trimEnd()}…`
    : text;
};

const keyOf = (node: Nodes, index: number) =>
  `${node.type}-${node.position?.start.offset ?? "x"}-${index}`;

const renderChildren = (parent: Parent, depth: number): ReactNode[] =>
  (parent.children as RootContent[]).map((child, index) =>
    renderNode(child, keyOf(child, index), depth)
  );

const headingTags = ["h2", "h3", "h4", "h5", "h6", "h6"] as const;

const renderRow = (
  row: TableRow,
  key: string,
  header: boolean,
  align: (string | null)[],
  depth: number
) => (
  <tr key={key}>
    {row.children.map((cell, index) => {
      const Cell = header ? "th" : "td";
      const alignment = align[index];
      return (
        <Cell
          className={
            alignment === "center"
              ? "text-center"
              : alignment === "right"
                ? "text-end"
                : "text-start"
          }
          key={keyOf(cell, index)}
        >
          {renderChildren(cell, depth)}
        </Cell>
      );
    })}
  </tr>
);

const renderNode = (
  node: RootContent | PhrasingContent,
  key: string,
  depth: number
): ReactNode => {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{renderChildren(node, depth)}</p>;
    case "heading": {
      // The page title is the h1; document headings start at h2.
      const Tag = headingTags[node.depth - 1] ?? "h6";
      return <Tag key={key}>{renderChildren(node, depth)}</Tag>;
    }
    case "text":
      return node.value;
    case "emphasis":
      return <em key={key}>{renderChildren(node, depth)}</em>;
    case "strong":
      return <strong key={key}>{renderChildren(node, depth)}</strong>;
    case "delete":
      return <del key={key}>{renderChildren(node, depth)}</del>;
    case "inlineCode":
      return <code key={key}>{node.value}</code>;
    case "code":
      return (
        <pre dir="ltr" key={key}>
          <code>{node.value}</code>
        </pre>
      );
    case "blockquote":
      return (
        <blockquote key={key}>{renderChildren(node, depth)}</blockquote>
      );
    case "list": {
      const Tag = node.ordered ? "ol" : "ul";
      return (
        <Tag key={key} start={node.ordered ? (node.start ?? 1) : undefined}>
          {renderChildren(node, depth)}
        </Tag>
      );
    }
    case "listItem": {
      // Tight list items wrap their text in paragraphs; unwrap them.
      const content = node.children.flatMap((child, index) =>
        child.type === "paragraph" && !node.spread
          ? renderChildren(child, depth)
          : [renderNode(child, keyOf(child, index), depth)]
      );
      return (
        <li key={key}>
          {typeof node.checked === "boolean" ? (
            <input
              checked={node.checked}
              className="me-2 align-middle"
              disabled
              readOnly
              type="checkbox"
            />
          ) : null}
          {content}
        </li>
      );
    }
    case "link": {
      const href = safeUrl(node.url);
      if (!href) {
        return <span key={key}>{renderChildren(node, depth)}</span>;
      }
      return isExternal(href) ? (
        <a href={href} key={key} rel="noopener noreferrer" target="_blank">
          {renderChildren(node, depth)}
        </a>
      ) : (
        <a href={href} key={key}>
          {renderChildren(node, depth)}
        </a>
      );
    }
    case "image": {
      const src = safeImageUrl(node.url);
      return src ? (
        // biome-ignore lint/performance/noImgElement: author-supplied images from arbitrary storage paths
        // biome-ignore lint/correctness/useImageSize: dimensions are unknown in Markdown
        <img alt={node.alt ?? ""} key={key} loading="lazy" src={src} />
      ) : null;
    }
    case "break":
      return <br key={key} />;
    case "thematicBreak":
      return <hr key={key} />;
    case "table": {
      const [head, ...body] = node.children;
      const align = node.align ?? [];
      return (
        <div className="overflow-x-auto" key={key}>
          <table>
            {head ? (
              <thead>{renderRow(head, "head", true, align, depth)}</thead>
            ) : null}
            <tbody>
              {body.map((row, index) =>
                renderRow(row, keyOf(row, index), false, align, depth)
              )}
            </tbody>
          </table>
        </div>
      );
    }
    // Raw HTML, link and footnote definitions, and anything else unknown
    // are not rendered.
    default:
      return null;
  }
};

interface MarkdownProps {
  readonly className?: string;
  readonly source: string;
}

/** Renders Markdown as React elements; raw HTML is never rendered. */
export const Markdown = ({ className, source }: MarkdownProps) => (
  <div className={className}>{renderChildren(parseMarkdown(source), 0)}</div>
);
