import { normalizePhone } from "@repo/auth/phone";
import { type Fulfilment, governorates } from "@repo/commerce";

/** The delivery address form, as typed. */
export interface AddressForm {
  address: string;
  city: string;
  fullName: string;
  /** A governorate id, when there are no delivery zones to choose from. */
  governorate: string;
  notes: string;
  phone: string;
  /** The chosen delivery zone (`delivery_zones.id`). */
  zoneId: string;
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

/** The parts of a delivery zone the form needs. */
export interface ZoneChoice {
  governorate: string | null;
  id: string;
}

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
  zoneId: "",
});

export type ValidatedAddress =
  | { errors: AddressField[]; shipping: null; zoneId: null }
  | { errors: []; shipping: ShippingAddress; zoneId: string | null };

/**
 * Checks the form like `create_order()` does and returns the payload, or
 * the fields to fix. The phone is normalized to E.164 ("0770…" works).
 * Pickup needs only a name and a phone. Delivery needs an address and a
 * zone from `zones` (its governorate goes on the address); without zones,
 * a governorate id, from which the database finds the zone.
 */
export const validateAddress = (
  form: AddressForm,
  {
    fulfilment = "delivery",
    zones,
  }: { fulfilment?: Fulfilment; zones?: readonly ZoneChoice[] } = {}
): ValidatedAddress => {
  const errors: AddressField[] = [];
  const phone = normalizePhone(form.phone);
  const delivery = fulfilment === "delivery";
  const zone = zones?.find(({ id }) => id === form.zoneId) ?? null;

  if (!form.fullName.trim()) {
    errors.push("fullName");
  }
  if (!phone) {
    errors.push("phone");
  }
  if (delivery && (zones ? !zone : !governorateIds.has(form.governorate))) {
    errors.push("governorate");
  }
  if (delivery && !form.address.trim()) {
    errors.push("address");
  }

  if (errors.length > 0 || !phone) {
    return { errors, shipping: null, zoneId: null };
  }

  return {
    errors: [],
    shipping: {
      address: delivery ? form.address.trim() : "",
      city: delivery ? form.city.trim() : "",
      full_name: form.fullName.trim(),
      governorate: delivery
        ? (zone ? zone.governorate : form.governorate) || ""
        : "",
      notes: form.notes.trim(),
      phone,
    },
    zoneId: delivery && zone ? zone.id : null,
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
