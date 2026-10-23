import { normalizePhone } from "@repo/auth/phone";
import { governorates } from "@repo/commerce";

/** The delivery address form, as typed. */
export interface AddressForm {
  address: string;
  city: string;
  fullName: string;
  governorate: string;
  notes: string;
  phone: string;
}

/** What `create_order(shipping)` stores (see the commerce migration). */
export interface ShippingAddress {
  address: string;
  city: string;
  full_name: string;
  governorate: string;
  notes: string;
  phone: string;
}

export type AddressField = "address" | "fullName" | "governorate" | "phone";

const governorateIds = new Set<string>(governorates.map(({ id }) => id));
const LEADING_PLUS = /^\+/;

/**
 * The account's phone for the form: Supabase keeps it without the "+",
 * the form shows it in E.164.
 */
export const accountPhone = (phone: string | null | undefined) =>
  phone ? `+${phone.replace(LEADING_PLUS, "")}` : "";

export const emptyAddress = (phone = ""): AddressForm => ({
  address: "",
  city: "",
  fullName: "",
  governorate: "",
  notes: "",
  phone,
});

/**
 * Checks the form like `create_order()` does and returns the payload, or
 * the fields to fix. The phone is normalized to E.164 ("0770…" works).
 */
export const validateAddress = (
  form: AddressForm
):
  | { errors: AddressField[]; shipping: null }
  | { errors: []; shipping: ShippingAddress } => {
  const errors: AddressField[] = [];
  const phone = normalizePhone(form.phone);

  if (!form.fullName.trim()) {
    errors.push("fullName");
  }
  if (!phone) {
    errors.push("phone");
  }
  if (!governorateIds.has(form.governorate)) {
    errors.push("governorate");
  }
  if (!form.address.trim()) {
    errors.push("address");
  }

  if (errors.length > 0 || !phone) {
    return { errors, shipping: null };
  }

  return {
    errors: [],
    shipping: {
      address: form.address.trim(),
      city: form.city.trim(),
      full_name: form.fullName.trim(),
      governorate: form.governorate,
      notes: form.notes.trim(),
      phone,
    },
  };
};

/** A stored governorate id ("baghdad") in the reader's language. */
export const governorateName = (id: string, locale: string) => {
  const match = governorates.find((governorate) => governorate.id === id);
  if (!match) {
    return id;
  }
  return locale === "en" ? match.en : match.ar;
};
