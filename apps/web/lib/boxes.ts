import { localized } from "@repo/commerce";

/** Named in both languages. */
interface Named {
  name_ar: string;
  name_en: string;
}

/** A fixed part (a product) or a slot staff fill from a category. */
export interface BoxPart {
  category: Named | null;
  format: string | null;
  id: string;
  position: number;
  product: (Named & { slug: string }) | null;
  quantity: number;
}

export interface BoxTheme extends Named {
  active: boolean;
  id: string;
  position: number;
}

/** A box: a Store product built from parts, packed to a picked theme. */
export interface Box {
  box_parts: BoxPart[];
  box_themes: BoxTheme[];
  min_value: number;
  product_id: string;
}

export const BOX_COLUMNS =
  "product_id, min_value, box_parts (id, quantity, format, position, product:products (slug, name_ar, name_en), category:product_categories (name_ar, name_en)), box_themes (id, name_ar, name_en, active, position)" as const;

const byPosition = <T extends { position: number }>(items: readonly T[]) =>
  [...items].sort((a, b) => a.position - b.position);

/** The parts in order: the fixed ones, then the slots. */
export const boxParts = (box: Box) => byPosition(box.box_parts);

/** The themes a customer can pick, in order (none when it isn't a box). */
export const boxThemes = (box: Box | null) =>
  byPosition((box?.box_themes ?? []).filter((theme) => theme.active));

/** Whether a theme is picked, when the box has themes to pick from. */
export const themeReady = (
  themes: readonly BoxTheme[],
  themeId: string | null
) => themes.length === 0 || themeId !== null;

/** Whether the part is a slot staff fill (not a fixed product). */
export const isSlot = (part: BoxPart) => part.product === null;

/** What a part is called: the product, or the slot's format or category. */
export const partName = (part: BoxPart, locale: string) => {
  if (part.product) {
    return localized(part.product, "name", locale);
  }
  const category = part.category
    ? localized(part.category, "name", locale)
    : "";
  return part.format ? `${part.format} · ${category}` : category;
};
