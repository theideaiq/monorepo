/**
 * Barcodes follow GTIN (brief section 25): EAN-8, UPC-A (12), EAN-13 and
 * ISBN-13 (13), GTIN-14, each ending in a mod-10 check digit. ISBN-10s are
 * turned into ISBN-13 (978…) so books match their barcode.
 */

const NON_DIGITS = /[^0-9X]/gi;
const GTIN_LENGTHS = new Set([8, 12, 13, 14]);
const DIGITS = /^\d+$/;

/** Whether `digits` (8, 12, 13 or 14 of them) ends in the right check digit. */
export const isGtin = (digits: string) => {
  if (!(GTIN_LENGTHS.has(digits.length) && DIGITS.test(digits))) {
    return false;
  }
  let sum = 0;
  for (let index = 0; index < digits.length - 1; index += 1) {
    const weight = (digits.length - 1 - index) % 2 === 1 ? 3 : 1;
    sum += Number(digits[index]) * weight;
  }
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
};

const isbn10Valid = (value: string) => {
  let sum = 0;
  for (let index = 0; index < 10; index += 1) {
    const char = value[index] ?? "";
    const digit = char.toUpperCase() === "X" && index === 9 ? 10 : Number(char);
    if (Number.isNaN(digit)) {
      return false;
    }
    sum += digit * (10 - index);
  }
  return sum % 11 === 0;
};

/** "0-06-112241-6" → "9780061122416". */
export const isbn10To13 = (value: string) => {
  const body = `978${value.slice(0, 9)}`;
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number(body[index]) * (index % 2 === 0 ? 1 : 3);
  }
  return `${body}${(10 - (sum % 10)) % 10}`;
};

/**
 * A typed or scanned barcode or ISBN as a valid GTIN (digits only), or
 * null: spaces and dashes are dropped and an ISBN-10 becomes ISBN-13.
 */
export const normalizeGtin = (value: string | null | undefined) => {
  const cleaned = (value ?? "").replace(NON_DIGITS, "").toUpperCase();
  if (cleaned.length === 10 && isbn10Valid(cleaned)) {
    return isbn10To13(cleaned);
  }
  return isGtin(cleaned) ? cleaned : null;
};
