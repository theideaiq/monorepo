import type { TailwindConfig } from "@react-email/components";

/**
 * The IDEA brand v1.0 values for email (docs/brand/tokens.json, Paper
 * theme). Email clients can't read CSS variables, so templates use these
 * names instead of raw values.
 */
export const brand = {
  border: "#E4DFD0",
  borderStrong: "#8A8C95",
  bulbYellow: "#F4CF08",
  ideaPink: "#D81B60",
  ideaPinkHover: "#B5134E",
  ink: "#0F1014",
  inkMuted: "#5B5D66",
  onPink: "#FFFFFF",
  onYellow: "#0F1014",
  pinkText: "#D81B60",
  surface: "#FBF8EF",
  surfaceRaised: "#FFFFFF",
  surfaceSunken: "#F2EEE2",
} as const;

/** Alexandria for Arabic and Latin, then what email clients have. */
export const emailFont =
  "Alexandria, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Roboto, Arial, sans-serif";

/** The same names as the apps' tokens, for the templates' Tailwind classes. */
export const emailTailwindConfig: TailwindConfig = {
  theme: {
    extend: {
      colors: {
        border: brand.border,
        "border-strong": brand.borderStrong,
        "bulb-yellow": brand.bulbYellow,
        "idea-pink": brand.ideaPink,
        ink: brand.ink,
        "ink-muted": brand.inkMuted,
        "on-pink": brand.onPink,
        "pink-text": brand.pinkText,
        surface: brand.surface,
        "surface-raised": brand.surfaceRaised,
        "surface-sunken": brand.surfaceSunken,
      },
      fontFamily: { sans: emailFont.split(", ") },
    },
  },
};
