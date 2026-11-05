import { encode } from "uqr";

/**
 * A QR code as one SVG path of dark modules, for printing: `size` is the
 * viewBox's width and height in modules (border included).
 */
export const qrPath = (value: string) => {
  const { data, size } = encode(value, { border: 2, ecc: "M" });
  const path = data
    .flatMap((row, y) =>
      row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ""))
    )
    .join("");
  return { path, size };
};
