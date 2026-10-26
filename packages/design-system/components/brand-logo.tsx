import { project } from "@repo/config";
import { cn } from "../lib/utils";
import { Bulb } from "./brand/bulb";

/** The grounds the logo sits on (BRAND_GUIDELINES.md, section 4). */
export type BrandLogoVariant =
  | "auto"
  | "on-dark"
  | "on-light"
  | "on-pink"
  | "on-yellow";

/** A line of The IDEA, set after the wordmark in a line lock-up. */
export type Line =
  | "Business"
  | "Club"
  | "Design"
  | "Droid"
  | "Pass"
  | "Plus"
  | "Staff"
  | "Store";

interface BrandLogoProps {
  readonly className?: string;
  /** Adds the line word (weight 600) after The IDEA: a line lock-up. */
  readonly line?: Line;
  readonly showName?: boolean;
  /**
   * The ground: pink bulb and wordmark on light and yellow, yellow bulb and
   * white wordmark on pink and dark. `auto` follows the theme (light on
   * Paper, dark in dark mode). Never black.
   */
  readonly variant?: BrandLogoVariant;
}

const bulbColor: Record<BrandLogoVariant, string> = {
  auto: "text-idea-pink dark:text-bulb-yellow",
  "on-dark": "text-bulb-yellow",
  "on-light": "text-idea-pink",
  "on-pink": "text-bulb-yellow",
  "on-yellow": "text-idea-pink",
};

const wordColor: Record<BrandLogoVariant, string> = {
  auto: "text-idea-pink dark:text-on-pink",
  "on-dark": "text-on-pink",
  "on-light": "text-idea-pink",
  "on-pink": "text-on-pink",
  "on-yellow": "text-idea-pink",
};

const arabicName = project.localizedName?.ar;

/**
 * The IDEA's lock-up: the bulb, a gap of a third of its height, then the
 * wordmark in Readex Pro 700 (−1% tracking); the bulb is 1.6 × the cap
 * height. Every app renders the brand through this component.
 *
 * On Arabic pages (`lang="ar"`) the name alone is the Arabic one from
 * `project.json`, chosen in CSS so this works in server and client
 * components; a line lock-up keeps the Latin product name ("The IDEA
 * Business"), set left-to-right.
 */
export const BrandLogo = ({
  className,
  line,
  showName = true,
  variant = "auto",
}: BrandLogoProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-[0.38em] font-bold tracking-[-0.01em]",
      className
    )}
    data-variant={variant}
  >
    <Bulb className={cn("size-[1.15em] shrink-0", bulbColor[variant])} />
    {showName ? (
      <span className={cn("whitespace-nowrap", wordColor[variant])}>
        {arabicName && !line ? (
          <>
            <span className="[&:lang(ar)]:hidden" dir="ltr">
              {project.name}
            </span>
            <span className="hidden [&:lang(ar)]:inline">{arabicName}</span>
          </>
        ) : (
          <span dir="ltr">
            {project.name}
            {line ? <span className="font-semibold"> {line}</span> : null}
          </span>
        )}
      </span>
    ) : null}
  </span>
);
