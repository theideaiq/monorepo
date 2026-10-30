import { liveVariants, variantName } from "@repo/commerce";
import type { CardVariant } from "@repo/commerce/catalog";

/** At most this many chips; the rest read "+n". */
const SHOWN = 3;

interface VariantChipsProps {
  readonly locale: string;
  readonly variants: readonly CardVariant[];
}

/**
 * The versions a product comes in (CD · Vinyl, PS5 · Switch), on a card.
 * Nothing for a product with one version.
 */
export const VariantChips = ({ locale, variants }: VariantChipsProps) => {
  const names = liveVariants(variants)
    .map((variant) => variantName(variant, locale))
    .filter(Boolean);
  if (names.length < 2) {
    return null;
  }
  return (
    <ul className="flex flex-wrap gap-1">
      {names.slice(0, SHOWN).map((name) => (
        <li
          className="rounded-sm border px-1.5 py-0.5 text-muted-foreground text-xs"
          key={name}
        >
          {name}
        </li>
      ))}
      {names.length > SHOWN ? (
        <li className="px-1 py-0.5 text-muted-foreground text-xs" dir="ltr">
          +{names.length - SHOWN}
        </li>
      ) : null}
    </ul>
  );
};
