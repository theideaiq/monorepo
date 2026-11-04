/** A shop's 90-day record: its score and how many order lines it rests on. */
export interface SellerRecord {
  lines: number;
  score: number;
}

/** The key of a listing's photos: variant, condition and seller. */
export const offerPhotoKey = (offer: {
  condition: string;
  seller_id: string;
  variant_id: string | null;
}) => `${offer.variant_id ?? ""}:${offer.condition}:${offer.seller_id}`;
