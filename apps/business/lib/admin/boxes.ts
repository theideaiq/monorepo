/** A box part as the back office loads it. */
export interface BoxPartRow {
  quantity: number;
  variant: { price: number } | null;
}

/**
 * What a box's parts are worth: the fixed parts at their prices plus what
 * the picked copies are worth at least (`private.box_value`).
 */
export const boxValue = (parts: readonly BoxPartRow[], minValue: number) =>
  parts.reduce(
    (sum, part) =>
      sum + (part.variant ? part.variant.price * part.quantity : 0),
    minValue
  );

/** How far below its parts a box is priced, in whole percent. */
export const percentBelow = (price: number, value: number) =>
  value > 0 ? Math.round(((value - price) / value) * 100) : 0;

/** Whether the price is 10–15% below the parts, as the database requires. */
export const boxPriceOk = (price: number, value: number) =>
  price >= Math.ceil(value * 0.85) && price <= Math.floor(value * 0.9);

/** The price range a box of this value may have. */
export const boxPriceRange = (value: number) => ({
  max: Math.floor(value * 0.9),
  min: Math.ceil(value * 0.85),
});
