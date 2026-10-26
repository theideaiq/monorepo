"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { CameraIcon, CameraOffIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { FieldGrid, TextField } from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { type CounterMember, checkInMember, lookupMember } from "../actions";

interface Detector {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => Detector;
  }
}

const SCAN_EVERY_MS = 400;

/**
 * Reads the card's QR code with the device camera where the browser can
 * (BarcodeDetector); elsewhere a USB scanner or typing does the same.
 */
const CameraScanner = ({
  onCode,
}: {
  readonly onCode: (code: string) => void;
}) => {
  const t = useTranslations("admin.counter");
  const video = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [failed, setFailed] = useState(false);
  const supported =
    typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    if (!(on && video.current && window.BarcodeDetector)) {
      return;
    }
    const element = video.current;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    const scan = async () => {
      const [found] = await detector.detect(element).catch(() => []);
      if (found?.rawValue.startsWith("IDEA:")) {
        setOn(false);
        onCode(found.rawValue);
      }
    };
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        element.srcObject = stream;
        await element.play();
        timer = setInterval(scan, SCAN_EVERY_MS);
      } catch {
        setFailed(true);
        setOn(false);
      }
    };
    start();
    return () => {
      clearInterval(timer);
      for (const track of stream?.getTracks() ?? []) {
        track.stop();
      }
    };
  }, [on, onCode]);

  if (!supported) {
    return null;
  }
  return (
    <div className="grid gap-2">
      <Button
        className="w-fit"
        onClick={() => setOn(!on)}
        type="button"
        variant="secondary"
      >
        {on ? <CameraOffIcon /> : <CameraIcon />}
        {on ? t("stopCamera") : t("camera")}
      </Button>
      {on ? (
        <video
          className="aspect-video w-full max-w-sm rounded-md bg-muted object-cover"
          muted
          playsInline
          ref={video}
        />
      ) : null}
      {failed ? (
        <p className="text-destructive text-sm" role="alert">
          {t("cameraError")}
        </p>
      ) : null}
    </div>
  );
};

const MemberCard = ({
  canCheckIn,
  member,
}: {
  readonly canCheckIn: boolean;
  readonly member: CounterMember;
}) => {
  const t = useTranslations("admin.counter");
  const tTier = useTranslations("app.bulbs.tiers");
  const format = formatters(useLocale() as Locale);
  const [checkedIn, setCheckedIn] = useState<Set<string>>(new Set());

  if (!(member.valid && member.userId)) {
    return (
      <Panel>
        <div className="flex items-center gap-3 text-sm" role="status">
          <Badge variant="destructive">{t("invalid")}</Badge>
          <span className="text-muted-foreground">
            {member.userId ? t("expired") : t("unknown")}
          </span>
        </div>
      </Panel>
    );
  }
  const { userId } = member;

  return (
    <div className="grid gap-4 lg:grid-cols-2" role="status">
      <Panel
        actions={<Badge>{t("valid")}</Badge>}
        title={member.name || t("unnamed")}
      >
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">{t("number")}</dt>
          <dd className="text-end" dir="ltr">
            № {member.memberNumber}
          </dd>
          {member.memberSince ? (
            <>
              <dt className="text-muted-foreground">{t("since")}</dt>
              <dd className="text-end">{format.date(member.memberSince)}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">{t("bulbs")}</dt>
          <dd className="text-end tabular-nums">
            {member.bulbs
              ? `${format.number(member.bulbs.available)} · ${tTier(`${member.bulbs.tier as "glow"}.name`)}`
              : "—"}
          </dd>
          <dt className="text-muted-foreground">{t("plus")}</dt>
          <dd className="text-end">
            {member.plus
              ? `${member.plus.name}${member.plus.until ? ` · ${format.date(member.plus.until)}` : ""}`
              : t("noPlus")}
          </dd>
        </dl>
        <Link
          className="mt-4 inline-block text-sm underline"
          href={`/customers/${userId}`}
        >
          {t("openMember")}
        </Link>
      </Panel>

      <div className="grid content-start gap-4">
        <Panel title={t("rentals")}>
          {member.rentals.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noRentals")}</p>
          ) : (
            <ul className="divide-y text-sm">
              {member.rentals.map((rental) => (
                <li
                  className="flex items-center justify-between gap-3 py-2"
                  key={rental.id}
                >
                  <span>{rental.name}</span>
                  <span className="text-muted-foreground">
                    {rental.dueAt
                      ? t("due", { date: format.date(rental.dueAt) })
                      : t(`rentalStatus.${rental.status as "requested"}`)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link className="mt-3 inline-block text-sm underline" href="/rentals">
            {t("openRentals")}
          </Link>
        </Panel>

        <Panel title={t("events")}>
          {member.rsvps.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noEvents")}</p>
          ) : (
            <ul className="divide-y text-sm">
              {member.rsvps.map((rsvp) => {
                const done = rsvp.checkedIn || checkedIn.has(rsvp.eventId);
                return (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 py-2"
                    key={rsvp.eventId}
                  >
                    <span>
                      {rsvp.title} · {format.dateTime(rsvp.startsAt)}
                    </span>
                    {done ? (
                      <Badge variant="secondary">{t("checkedIn")}</Badge>
                    ) : null}
                    {!done && canCheckIn ? (
                      <ActionForm
                        action={checkInMember}
                        onSuccess={() =>
                          setCheckedIn(new Set([...checkedIn, rsvp.eventId]))
                        }
                        silent
                      >
                        <input
                          name="eventId"
                          type="hidden"
                          value={rsvp.eventId}
                        />
                        <input name="userId" type="hidden" value={userId} />
                        <SubmitButton size="sm">{t("checkIn")}</SubmitButton>
                      </ActionForm>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
};

/**
 * The counter: scan or type a member's The IDEA Pass, then see who they
 * are, their Bulbs, Plus and rentals, and check them in at today's events.
 */
export const Counter = ({ canCheckIn }: { readonly canCheckIn: boolean }) => {
  const t = useTranslations("admin.counter");
  const scanned = useRef<HTMLInputElement>(null);
  const [member, setMember] = useState<CounterMember | null>(null);

  const submitScan = (code: string) => {
    if (scanned.current) {
      scanned.current.value = code;
      scanned.current.form?.requestSubmit();
    }
  };

  return (
    <div className="grid gap-6">
      <Panel description={t("description")} title={t("check")}>
        <div className="grid gap-4">
          <CameraScanner onCode={submitScan} />
          <ActionForm
            action={lookupMember}
            onSuccess={(state) =>
              setMember(
                (state.data?.member as CounterMember | undefined) ?? null
              )
            }
            resetOnSuccess
            silent
          >
            <FieldGrid columns={3}>
              <TextField
                autoComplete="off"
                // A USB scanner types the QR text here and presses Enter.
                autoFocus
                dir="ltr"
                label={t("scanned")}
                name="scanned"
                ref={scanned}
              />
              <TextField
                autoComplete="off"
                dir="ltr"
                hint={t("codeHint")}
                inputMode="numeric"
                label={t("code")}
                name="code"
              />
              <div className="flex items-end">
                <SubmitButton>{t("submit")}</SubmitButton>
              </div>
            </FieldGrid>
          </ActionForm>
        </div>
      </Panel>
      {member ? <MemberCard canCheckIn={canCheckIn} member={member} /> : null}
    </div>
  );
};
