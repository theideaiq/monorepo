import { memo } from "react";

/**
 * The guilloché on The IDEA Pass card: banknote-style rosettes
 * (hypotrochoids) and fine wave lines, drawn once from formulas. The card
 * is an ID-1 card (85.6 × 54 mm), so the view box is 856 × 540.
 */

const WIDTH = 856;
const HEIGHT = 540;
const TAU = Math.PI * 2;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const round = (value: number) => Math.round(value * 10) / 10;

interface Rosette {
  /** Radius of the fixed circle. */
  readonly big: number;
  /** Distance of the pen from the small circle's centre. */
  readonly d: number;
  readonly rotation: number;
  /** Radius of the rolling circle. */
  readonly small: number;
}

/** A closed hypotrochoid around (cx, cy), as an SVG path. */
const rosettePath = (
  { big, d, rotation, small }: Rosette,
  cx: number,
  cy: number,
  scale: number
) => {
  const turns = small / gcd(big, small);
  const steps = 900 * turns;
  const ratio = (big - small) / small;
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * TAU * turns;
    const x = (big - small) * Math.cos(t) + d * Math.cos(ratio * t);
    const y = (big - small) * Math.sin(t) - d * Math.sin(ratio * t);
    const rx = x * Math.cos(rotation) - y * Math.sin(rotation);
    const ry = x * Math.sin(rotation) + y * Math.cos(rotation);
    points.push(`${round(cx + rx * scale)} ${round(cy + ry * scale)}`);
  }
  return `M${points.join("L")}Z`;
};

/** A horizontal wave across the card. */
const wavePath = (index: number) => {
  const base = 40 + index * 18;
  const amplitude = 6 + (index % 5) * 1.5;
  const phase = index * 0.45;
  const points: string[] = [];
  for (let x = 0; x <= WIDTH; x += 8) {
    const y =
      base +
      amplitude * Math.sin((x / WIDTH) * TAU * 3 + phase) +
      3 * Math.sin((x / WIDTH) * TAU * 11 - phase);
    points.push(`${x} ${round(y)}`);
  }
  return `M${points.join("L")}`;
};

const ROSETTES: Rosette[] = [
  { big: 60, d: 42, rotation: 0, small: 21 },
  { big: 60, d: 34, rotation: 0.12, small: 17 },
  { big: 60, d: 26, rotation: 0.24, small: 13 },
  { big: 60, d: 50, rotation: 0.36, small: 23 },
];

// Computed once when the module loads: the card never changes shape.
const ROSETTE_PATHS = ROSETTES.map((rosette) =>
  rosettePath(rosette, 660, 270, 3.1)
);
const SMALL_ROSETTE = rosettePath(
  { big: 40, d: 24, rotation: 0, small: 11 },
  120,
  430,
  1.6
);
const WAVE_PATHS = Array.from({ length: 26 }, (_, index) => wavePath(index));

// Memoized: the card re-renders every second for its countdown, and the
// guilloché never changes.
export const Guilloche = memo(
  ({ className }: { readonly className?: string }) => (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    >
      <g stroke="currentColor" strokeWidth="0.6">
        {WAVE_PATHS.map((path) => (
          <path d={path} key={path.slice(0, 24)} opacity="0.35" />
        ))}
      </g>
      <g stroke="currentColor" strokeWidth="0.7">
        {ROSETTE_PATHS.map((path, index) => (
          <path d={path} key={ROSETTES[index]?.small} opacity="0.55" />
        ))}
        <path d={SMALL_ROSETTE} opacity="0.4" />
      </g>
    </svg>
  )
);
