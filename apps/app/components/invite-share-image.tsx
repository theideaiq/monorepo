import { BULB_PATH } from "@repo/design-system/components/brand/bulb";
import {
  EVENT_IMAGE_COLORS,
  EVENT_IMAGE_SIZE,
  Line,
  LockUp,
  type ShareText,
} from "@/components/club/event-share-image";

export const INVITE_IMAGE_SIZE = EVENT_IMAGE_SIZE;

/** The text column's width beside the bulb. */
export const INVITE_IMAGE_TEXT = {
  offer: 36,
  titleMaxHeight: 300,
  titleSizes: [80, 66, 56],
  width: 1200 - 2 * 64 - 56 - 240,
} as const;

export interface InviteShareImageProps {
  /** "10% off your first order (up to 25,000 IQD)." */
  readonly offer: ShareText;
  readonly rtl: boolean;
  /** "A friend invited you to The IDEA". */
  readonly title: ShareText;
}

/**
 * The share image of an invite link (`/r/<code>`), drawn by `next/og` like
 * the event image (`EventShareImage`, whose notes on Arabic text apply):
 * The IDEA Pink ground, the lock-up, the invite and its offer, and the bulb.
 * Nothing personal: it is the same for every invite in a language.
 */
export const InviteShareImage = ({
  offer,
  rtl,
  title,
}: InviteShareImageProps) => (
  <div
    style={{
      background: EVENT_IMAGE_COLORS.pink,
      display: "flex",
      flexDirection: rtl ? "row-reverse" : "row",
      fontFamily: "Alexandria",
      height: "100%",
      padding: 64,
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
      <LockUp line={null} />
      <Line
        right={rtl}
        size={INVITE_IMAGE_TEXT.titleSizes[1]}
        text={title}
        weight={700}
      />
      <Line
        right={rtl}
        size={INVITE_IMAGE_TEXT.offer}
        text={offer}
        weight={600}
      />
    </div>
    <div
      style={{
        alignItems: "flex-end",
        display: "flex",
        flexShrink: 0,
        marginLeft: rtl ? 0 : 56,
        marginRight: rtl ? 56 : 0,
      }}
    >
      <svg aria-hidden="true" height={240} viewBox="0 0 509 510" width={240}>
        <path d={BULB_PATH} fill={EVENT_IMAGE_COLORS.yellow} />
      </svg>
    </div>
  </div>
);
