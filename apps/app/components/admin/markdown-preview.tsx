import { cn } from "@repo/design-system/lib/utils";
import { renderMarkdown } from "@/lib/admin/markdown";

/**
 * Rendered Markdown. `renderMarkdown` escapes raw HTML and drops unsafe
 * links, so member-written submissions are safe to show.
 */
export const MarkdownPreview = ({
  className,
  dir,
  invert = true,
  source,
}: {
  readonly className?: string;
  /** Light text in dark mode (off for email previews on white). */
  readonly invert?: boolean;
  readonly dir?: "ltr" | "rtl" | "auto";
  readonly source: string;
}) => (
  <div
    className={cn(
      "prose prose-sm max-w-none",
      invert && "dark:prose-invert",
      className
    )}
    // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by renderMarkdown (raw HTML escaped, URLs filtered)
    dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    dir={dir}
  />
);
