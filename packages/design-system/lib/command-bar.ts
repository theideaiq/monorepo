/** One place the command bar can go. */
export interface CommandBarItem {
  /** A second line, e.g. the order's total or the section. */
  detail?: string;
  href: string;
  id: string;
  /** Extra words a page answers to (e.g. its section). */
  keywords?: readonly string[];
  label: string;
}

/** Search results under one heading (Orders, Products, Customers…). */
export interface CommandBarGroup {
  heading: string;
  id: string;
  items: CommandBarItem[];
}

const WHITESPACE = /\s+/;
// Arabic short vowels, tanwin and hamza marks: U+064B to U+065F, U+0670.
const MARKS = /[ً-ٰٟ]/g;
const ALEFS = /[أإآ]/g;
const ALEF_MAKSURA = /ى/g;
const TEH_MARBUTA = /ة/g;

/** Folds case and Arabic letter variants so "اختبار" finds "إختبار". */
export const foldSearch = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(MARKS, "")
    .replace(ALEFS, "ا")
    .replace(ALEF_MAKSURA, "ي")
    .replace(TEH_MARBUTA, "ه")
    .trim();

/** The pages whose label or keywords hold every word of the query. */
export const matchPages = (
  pages: readonly CommandBarItem[],
  query: string
): CommandBarItem[] => {
  const words = foldSearch(query).split(WHITESPACE).filter(Boolean);
  if (words.length === 0) {
    return [...pages];
  }
  return pages.filter((page) => {
    const text = foldSearch([page.label, ...(page.keywords ?? [])].join(" "));
    return words.every((word) => text.includes(word));
  });
};
