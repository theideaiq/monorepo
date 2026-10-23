import { cn } from "@repo/design-system/lib/utils";
import { renderMarkdown } from "@/lib/markdown";

/**
 * Rendered Markdown. `renderMarkdown` escapes raw HTML and drops unsafe
 * links, so member-written submissions are safe to show.
 */
export const MarkdownPreview = ({
  className,
  dir,
  source,
}: {
  readonly className?: string;
  readonly dir?: "ltr" | "rtl" | "auto";
  readonly source: string;
}) => (
  <div
    className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
    // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by renderMarkdown (raw HTML escaped, URLs filtered)
    dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    dir={dir}
  />
);
