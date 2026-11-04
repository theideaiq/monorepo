import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

/**
 * Shared pieces for generated share images (`opengraph-image.tsx`): the
 * brand font for Satori, Arabic text drawn with Pango, and covers.
 */

type Weight = 400 | 600 | 700;

const FONT_FILES: Record<Weight, string> = {
  400: "Alexandria-Regular.ttf",
  600: "Alexandria-SemiBold.ttf",
  700: "Alexandria-Bold.ttf",
};

/** The fonts' full names, as Pango looks them up. */
const PANGO_FONTS: Record<Weight, string> = {
  400: "Alexandria",
  600: "Alexandria SemiBold",
  700: "Alexandria Bold",
};

const fontPath = (weight: Weight) =>
  join(process.cwd(), "assets", "og", FONT_FILES[weight]);

/**
 * Alexandria (BRAND_GUIDELINES.md section 7), for Arabic and Latin alike,
 * as TTF (Satori reads TTF, OTF and WOFF, not WOFF2). SIL OFL 1.1, see
 * `assets/og/OFL.txt`.
 */
export const loadBrandFonts = async () => {
  const weights = [400, 600, 700] as const;
  const files = await Promise.all(
    weights.map((weight) => readFile(fontPath(weight)))
  );
  return weights.map((weight, index) => ({
    data: files[index] as Buffer,
    name: "Alexandria",
    style: "normal" as const,
    weight,
  }));
};

const MARKUP = /[&<>"']/g;
const ENTITIES: Record<string, string> = {
  "'": "&apos;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

/** Escapes text for Pango markup. */
export const escapeMarkup = (text: string) =>
  text.replace(MARKUP, (character) => ENTITIES[character] ?? character);

const RLM = "\u200F";
const LRM = "\u200E";

/** Drawn at twice the size and shown at half, for smooth edges. */
const SCALE = 2;

export interface TextImageOptions {
  color: string;
  /** The paragraph direction; lines align to its start. */
  rtl: boolean;
  /** In pixels. */
  size: number;
  text: string;
  weight: Weight;
  /** Lines wrap at this width, in pixels. */
  width: number;
}

/**
 * Text drawn by Pango (through sharp), which shapes Arabic and orders mixed
 * Arabic and Latin text properly; Satori does neither. A PNG data: URL with
 * the size to show it at, or null when it couldn't be drawn (the caller then
 * lets Satori draw the text).
 */
export const textImage = async ({
  color,
  rtl,
  size,
  text,
  weight,
  width,
}: TextImageOptions) => {
  try {
    const { data, info } = await sharp({
      text: {
        // Pango takes the paragraph's direction from its first strong
        // character (hence the mark) and flips the alignment for
        // right-to-left paragraphs, so "left" is the start either way.
        align: "left",
        dpi: 72 * SCALE,
        font: `${PANGO_FONTS[weight]} ${size}`,
        fontfile: fontPath(weight),
        rgba: true,
        text: `${rtl ? RLM : LRM}<span foreground="${color}">${escapeMarkup(text)}</span>`,
        width: width * SCALE,
        wrap: "word",
      },
    })
      .png()
      .toBuffer({ resolveWithObject: true });
    return {
      height: Math.round(info.height / SCALE),
      src: `data:image/png;base64,${data.toString("base64")}`,
      width: Math.round(info.width / SCALE),
    };
  } catch {
    return null;
  }
};

/**
 * The text at the largest of `sizes` whose drawing fits `maxHeight`, else at
 * the smallest.
 */
export const fittedTextImage = async (
  options: Omit<TextImageOptions, "size">,
  sizes: readonly number[],
  maxHeight: number
) => {
  let image: Awaited<ReturnType<typeof textImage>> = null;
  for (const size of sizes) {
    // biome-ignore lint/performance/noAwaitInLoops: one size at a time, stopping at the first that fits.
    image = await textImage({ ...options, size });
    if (!image || image.height <= maxHeight) {
      return image;
    }
  }
  return image;
};

const COVER_TIMEOUT_MS = 4000;

/**
 * The cover at the given size as a JPEG data: URL, or null when it can't be
 * fetched or read: the image is drawn without it rather than failing.
 * Re-encoding also covers formats Satori can't draw (WebP, AVIF).
 */
export const coverDataUrl = async (
  url: string | null,
  { height, width }: { height: number; width: number },
  fetchImpl: typeof fetch = fetch
) => {
  if (!url) {
    return null;
  }
  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(COVER_TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }
    const jpeg = await sharp(Buffer.from(await response.arrayBuffer()))
      .rotate()
      .resize({ fit: "cover", height, width })
      .jpeg({ mozjpeg: true, quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
};
