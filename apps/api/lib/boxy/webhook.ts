/**
 * What a Boxy webhook is about. Its payload isn't documented, so this looks
 * for the parcel in any shape: an order object (Boxy's uid next to its
 * tracking code), else our order number (the parcel's custom id), else any
 * Boxy uid.
 */
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const DIGITS = /^\d{1,12}$/;

export const webhookReference = (payload: unknown) => {
  const seen: Record<string, unknown>[] = [];
  const visit = (value: unknown, depth: number) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      depth < 4
    ) {
      seen.push(value as Record<string, unknown>);
      for (const nested of Object.values(value)) {
        visit(nested, depth + 1);
      }
    }
  };
  visit(payload, 0);
  for (const node of seen) {
    if (
      typeof node.uid === "string" &&
      ULID.test(node.uid) &&
      "platform_code" in node
    ) {
      return { carrierId: node.uid };
    }
  }
  for (const node of seen) {
    const custom = node.custom_id;
    if (typeof custom === "string" && DIGITS.test(custom)) {
      return { orderNumber: Number(custom) };
    }
  }
  for (const node of seen) {
    for (const key of ["order_uid", "uid"]) {
      const value = node[key];
      if (typeof value === "string" && ULID.test(value)) {
        return { carrierId: value };
      }
    }
  }
  return null;
};
