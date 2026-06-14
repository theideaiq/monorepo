/**
 * Accurately calculates word count, properly stripping out Markdown syntax,
 * HTML tags, and handling both Latin and Arabic character boundaries.
 */
export function calculateWordCount(text?: string | null): number {
  if (!text) return 0;
  
  // Strip HTML tags and markdown artifacts
  const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/[#*`~_]/g, '');
  
  // Match contiguous blocks of word characters (works for both English and Arabic)
  const words = cleanText.match(/[\p{L}\p{N}]+/gu);
  
  return words ? words.length : 0;
}

/**
 * Generates a clean, SEO-friendly URL slug from a given string.
 * Transliterates standard characters and removes non-URL-safe symbols.
 */
export function generateSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove all non-word chars (except hyphens and Arabic/Latin letters)
    .replace(/[^\p{L}\p{N}\-]+/gu, '')
    // Collapse multiple consecutive hyphens into one
    .replace(/\-\-+/g, '-')
    // Trim hyphens from the start and end
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncates a long text string (like a journal abstract) without cutting 
 * words in half, appending an ellipsis.
 */
export function truncateSnippet(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Find the last space within the maxLength boundary
  const lastSpaceIndex = text.lastIndexOf(' ', maxLength);
  const cutoff = lastSpaceIndex > 0 ? lastSpaceIndex : maxLength;
  
  return `${text.substring(0, cutoff)}...`;
}
