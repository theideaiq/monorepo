import { governorates } from "@repo/commerce";

export interface ShippingAddress {
  address: string;
  city: string;
  fullName: string;
  governorate: string;
  notes: string;
  phone: string;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** An order's `shipping_address` (jsonb written by `create_order`). */
export const parseAddress = (value: unknown): ShippingAddress => {
  const row =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    address: text(row.address),
    city: text(row.city),
    fullName: text(row.full_name),
    governorate: text(row.governorate),
    notes: text(row.notes),
    phone: text(row.phone),
  };
};

/** A governorate id ("baghdad") or name in the reader's language. */
export const governorateName = (value: string, locale: string) => {
  const match = governorates.find(
    (item) => item.id === value || item.en === value || item.ar === value
  );
  if (!match) {
    return value;
  }
  return locale === "en" ? match.en : match.ar;
};
