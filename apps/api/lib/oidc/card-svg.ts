import { BULB_PATH } from "@repo/design-system/components/brand/bulb";

/**
 * The IDEA Pass card as an SVG image, for partner sites (the `card`
 * scope): the brand's card (856 × 540, an ID-1 card) with the name, the
 * member number, the plan and badges, and, where the live card has its
 * scannable code, a note that this copy isn't for scanning.
 */

export interface CardData {
  memberNumber: number | null;
  name: string;
  /** The The IDEA Plus plan's name, when the member has one. */
  plan: string | null;
  since: string;
  student: boolean;
}

export interface CardLabels {
  member: string;
  notForScanning: string;
  since: string;
  student: string;
}

const ESCAPES: Record<string, string> = {
  "'": "&#39;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};
const SPECIAL = /[&<>"']/g;
const escapeXml = (value: string) =>
  value.replace(SPECIAL, (character) => ESCAPES[character] ?? "");

const GROUPS = /\B(?=(\d{3})+(?!\d))/g;

/** 1234567 → "1 234 567", as on the live card. */
export const formatMemberNumber = (value: number) =>
  String(value).replace(GROUPS, " ");

const FONT =
  "font-family=\"'Readex Pro', 'Noto Sans Arabic', 'Segoe UI', Arial, sans-serif\"";

/** The card, as an SVG document. */
export const cardSvg = (card: CardData, labels: CardLabels, rtl: boolean) => {
  const plus = Boolean(card.plan);
  const stops = plus
    ? ["#4a3a12", "#1f1a10", "#0f1014"]
    : ["#f0507f", "#d81b60", "#8f0f3f"];
  const tier = [
    card.plan ?? labels.member,
    ...(card.student ? [labels.student] : []),
  ]
    .map(escapeXml)
    .join("  ·  ");
  const number = card.memberNumber
    ? `№ ${formatMemberNumber(card.memberNumber)}`
    : "";
  // Right-to-left text starts at the right edge (`start` follows `direction`).
  const textX = rtl ? 808 : 48;
  const spacing = rtl ? "" : ' letter-spacing="3"';
  const panelX = rtl ? 48 : 616;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 856 540" width="856" height="540" role="img" aria-label="${escapeXml(`The IDEA Pass · ${card.name}`)}">
<defs><radialGradient id="${plus ? "idea-pass-plus" : "idea-pass"}" cx="10%" cy="0%" r="120%"><stop offset="0" stop-color="${stops[0]}"/><stop offset=".45" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></radialGradient><clipPath id="idea-pass-edge"><rect width="856" height="540" rx="32"/></clipPath></defs>
<g clip-path="url(#idea-pass-edge)"><rect width="856" height="540" fill="url(#${plus ? "idea-pass-plus" : "idea-pass"})"/>
<g fill="none" stroke="#ffffff" stroke-opacity=".12">${Array.from({ length: 14 }, (_, i) => `<path d="M0 ${60 + i * 34} C 214 ${30 + i * 34}, 642 ${90 + i * 34}, 856 ${60 + i * 34}"/>`).join("")}</g>
<g transform="translate(48 44) scale(.088)" fill="#f4cf08"><path d="${BULB_PATH}"/></g>
<text x="104" y="84" ${FONT} font-size="34" font-weight="700" fill="#ffffff" direction="ltr">The IDEA <tspan font-weight="600">Pass</tspan></text>
<g ${FONT} fill="#ffffff" text-anchor="start" direction="${rtl ? "rtl" : "ltr"}">
<text x="${textX}" y="330" font-size="20"${spacing} fill-opacity=".8">${tier}</text>
<text x="${textX}" y="384" font-size="44" font-weight="600">${escapeXml(card.name)}</text>
<text x="${textX}" y="428" font-size="26" fill-opacity=".85" direction="ltr" text-anchor="${rtl ? "end" : "start"}">${escapeXml(number)}</text>
<text x="${textX}" y="492" font-size="18" fill-opacity=".75">${escapeXml(`${labels.since} ${card.since}`)}</text>
</g>
<g transform="translate(${panelX} 196)"><rect width="192" height="192" rx="18" fill="#ffffff" fill-opacity=".14" stroke="#ffffff" stroke-opacity=".35"/>
<g transform="translate(66 34) scale(.118)" fill="#ffffff" fill-opacity=".9"><path d="${BULB_PATH}"/></g>
<text x="96" y="140" ${FONT} font-size="15" fill="#ffffff" text-anchor="middle">${escapeXml(labels.notForScanning)}</text></g>
</g></svg>`;
};
