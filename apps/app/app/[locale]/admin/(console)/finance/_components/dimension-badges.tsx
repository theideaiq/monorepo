import type { Json } from "@repo/database";
import { StatusBadge } from "@/components/admin/status-badge";

/** A ledger line's dimensions as small "key: value" pills. */
export const DimensionBadges = ({ value }: { readonly value: Json }) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const entries = Object.entries(value).filter(
    ([, item]) => item !== null && item !== undefined && item !== ""
  );
  if (entries.length === 0) {
    return null;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {entries.map(([key, item]) => (
        <StatusBadge key={key}>
          <span dir="auto">
            {key}: {String(item)}
          </span>
        </StatusBadge>
      ))}
    </span>
  );
};
