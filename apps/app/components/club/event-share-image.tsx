import { project } from "@repo/config";
import { BULB_PATH } from "@repo/design-system/components/brand/bulb";
import type { ReactNode } from "react";
import { bidiText } from "@/lib/og-text";

/**
 * The share image of a Club event (`opengraph-image.tsx`), drawn by
 * `next/og` (Satori): The IDEA Pink ground, the Club lock-up (yellow bulb,
 * white wordmark), the title, the date and time in Baghdad, the place, and
 * the event's cover as a card when it has one.
 *
 * Satori has no bidi algorithm and measures Arabic words unshaped, so text
 * with Arabic in it comes in already drawn (`TextImage`, from Pango through
 * sharp: `lib/og-image.ts`); plain strings are drawn by Satori, with
 * `bidiText` word order as the fallback when an Arabic line couldn't be
 * drawn. Satori has no logical CSS properties either: Arabic pages mirror the
 * layout with `row-reverse` and right alignment.
 */

export const EVENT_IMAGE_SIZE = { height: 630, width: 1200 } as const;

export const EVENT_IMAGE_COLORS = {
  pink: "#D81B60",
  white: "#FFFFFF",
  yellow: "#F4CF08",
} as const;

const { pink: PINK, white: WHITE, yellow: YELLOW } = EVENT_IMAGE_COLORS;
const PADDING = 64;
const GUTTER = 56;
const ICON = 34;
const ICON_GAP = 18;
const BULB = 240;
/** The cover card's size. */
export const EVENT_IMAGE_COVER = { height: 502, width: 400 } as const;
/** The lock-up's line word (BrandLogo `line`): Latin in both languages. */
const LINE = "Club";

/** Font sizes, largest first for the title (the first that fits wins). */
export const EVENT_IMAGE_TEXT = {
  detail: 32,
  titleMaxHeight: 270,
  titleSizes: [76, 62, 52, 44],
} as const;

/** The width the title and the detail lines may take. */
export const eventImageWidths = (hasCover: boolean) => {
  const column =
    EVENT_IMAGE_SIZE.width -
    2 * PADDING -
    GUTTER -
    (hasCover ? EVENT_IMAGE_COVER.width : BULB);
  return { detail: column - ICON - ICON_GAP, title: column };
};

/** Text already drawn to a PNG, shown at `width` × `height`. */
export interface TextImage {
  readonly height: number;
  readonly src: string;
  readonly width: number;
}

type Text = string | TextImage;

export interface EventShareImageProps {
  /** A data: URL of the cover, already sized (or null for none). */
  readonly cover: string | null;
  /** "Friday, 20 November 2026". */
  readonly date: Text;
  readonly location: Text | null;
  readonly rtl: boolean;
  /** "7:30 PM – 10:00 PM, Baghdad time". */
  readonly time: Text;
  readonly title: Text;
}

interface LineProps {
  /** Align to the right edge (an Arabic page) rather than the left. */
  readonly right: boolean;
  readonly size: number;
  readonly text: Text;
  readonly weight?: 400 | 600 | 700;
}

/** Fallback title size by length when Satori draws it. */
const titleSize = (length: number, narrow: boolean) => {
  const [large, medium, small] = EVENT_IMAGE_TEXT.titleSizes;
  if (length <= (narrow ? 22 : 30)) {
    return large;
  }
  return length <= (narrow ? 44 : 60) ? medium : small;
};

/** A drawn text image, or a string laid out word by word (see `bidiText`). */
const Line = ({ right, size, text, weight = 400 }: LineProps) => {
  if (typeof text !== "string") {
    return (
      // biome-ignore lint/performance/noImgElement: Satori draws only <img>.
      // biome-ignore lint/a11y/useAltText: the image's alt is the page's.
      <img height={text.height} src={text.src} width={text.width} />
    );
  }
  const { rtl, runs } = bidiText(text);
  const gap = Math.round(size * 0.27);
  return (
    <div
      style={{
        color: WHITE,
        columnGap: gap,
        display: "flex",
        flexDirection: rtl ? "row-reverse" : "row",
        flexWrap: "wrap",
        fontSize: size,
        fontWeight: weight,
        // row-reverse starts at the right.
        justifyContent: rtl === right ? "flex-start" : "flex-end",
        lineHeight: 1.3,
        maxWidth: "100%",
      }}
    >
      {runs.map((run) => (
        <span key={run.key} style={{ display: "flex" }}>
          {/* Arabic inside an English line: Satori sets words left to
              right, so its words go in reversed. */}
          {(run.rtl && !rtl ? [...run.words].reverse() : run.words).join(" ")}
        </span>
      ))}
    </div>
  );
};

/**
 * Lucide's calendar-days, clock and map-pin, drawn inline: lucide-react's
 * components read React context, which Satori can't provide.
 */
const ICONS = {
  calendar: (
    <>
      <path d="M8 2v3M16 2v3M3 9h18" />
      <rect height="18" rx="2" width="18" x="3" y="3" />
      <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  place: (
    <>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
} as const;

const Detail = ({
  icon,
  right,
  text,
  weight,
}: {
  readonly icon: keyof typeof ICONS;
  readonly right: boolean;
  readonly text: Text;
  readonly weight?: 400 | 600;
}) => (
  <div
    style={{
      alignItems: "center",
      columnGap: ICON_GAP,
      display: "flex",
      flexDirection: right ? "row-reverse" : "row",
    }}
  >
    <svg
      aria-hidden="true"
      fill="none"
      height={ICON}
      stroke={YELLOW}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
      style={{ flexShrink: 0 }}
      viewBox="0 0 24 24"
      width={ICON}
    >
      {ICONS[icon]}
    </svg>
    <Line
      right={right}
      size={EVENT_IMAGE_TEXT.detail}
      text={text}
      weight={weight}
    />
  </div>
);

/**
 * The Club lock-up, left to right in both languages like `BrandLogo` with a
 * line: the bulb (1.6 × the cap height), a third of its height, then
 * "The IDEA" in 700 and "Club" in 600.
 */
const LockUp = () => (
  <div
    style={{
      alignItems: "center",
      color: WHITE,
      display: "flex",
      fontSize: 38,
      fontWeight: 700,
      letterSpacing: "-0.01em",
    }}
  >
    <svg aria-hidden="true" height="44" viewBox="0 0 509 510" width="44">
      <path d={BULB_PATH} fill={YELLOW} />
    </svg>
    <span style={{ display: "flex", marginLeft: 15 }}>{project.name}</span>
    <span style={{ display: "flex", fontWeight: 600, marginLeft: 11 }}>
      {LINE}
    </span>
  </div>
);

const Side = ({
  children,
  rtl,
}: {
  readonly children: ReactNode;
  readonly rtl: boolean;
}) => (
  <div
    style={{
      alignItems: "flex-end",
      display: "flex",
      flexShrink: 0,
      // The gutter on the side facing the text.
      marginLeft: rtl ? 0 : GUTTER,
      marginRight: rtl ? GUTTER : 0,
    }}
  >
    {children}
  </div>
);

export const EventShareImage = ({
  cover,
  date,
  location,
  rtl,
  time,
  title,
}: EventShareImageProps) => (
  <div
    style={{
      background: PINK,
      display: "flex",
      flexDirection: rtl ? "row-reverse" : "row",
      fontFamily: "Alexandria",
      height: "100%",
      padding: PADDING,
      width: "100%",
    }}
  >
    <div
      style={{
        alignItems: rtl ? "flex-end" : "flex-start",
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        flexShrink: 1,
        justifyContent: "space-between",
        minWidth: 0,
      }}
    >
      <LockUp />
      <Line
        right={rtl}
        size={
          typeof title === "string"
            ? titleSize(title.length, Boolean(cover))
            : 0
        }
        text={title}
        weight={700}
      />
      <div
        style={{
          alignItems: rtl ? "flex-end" : "flex-start",
          display: "flex",
          flexDirection: "column",
          rowGap: 10,
        }}
      >
        <Detail icon="calendar" right={rtl} text={date} weight={600} />
        <Detail icon="clock" right={rtl} text={time} />
        {location ? <Detail icon="place" right={rtl} text={location} /> : null}
      </div>
    </div>
    <Side rtl={rtl}>
      {cover ? (
        <div
          style={{
            borderRadius: 28,
            display: "flex",
            height: EVENT_IMAGE_COVER.height,
            overflow: "hidden",
            width: EVENT_IMAGE_COVER.width,
          }}
        >
          {/* biome-ignore lint/performance/noImgElement: Satori draws only <img>. */}
          <img
            alt=""
            height={EVENT_IMAGE_COVER.height}
            src={cover}
            style={{ objectFit: "cover" }}
            width={EVENT_IMAGE_COVER.width}
          />
        </div>
      ) : (
        <svg
          aria-hidden="true"
          height={BULB}
          viewBox="0 0 509 510"
          width={BULB}
        >
          <path d={BULB_PATH} fill={YELLOW} />
        </svg>
      )}
    </Side>
  </div>
);
