"use client";

import { normalizePhone } from "@repo/auth/phone";
import { useAuth } from "@repo/auth/provider";
import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import { MapPinIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { accountPhone, governorateName } from "@/lib/address";
import {
  type PlusStatus,
  usePlusActions,
  usePlusAreas,
  usePlusHome,
  usePlusStatus,
  WEEKDAYS,
} from "@/lib/plus-launch";
import { useDeliveryZones } from "@/lib/store-queries";

const BAGHDAD = "baghdad";

/** The member's area in Baghdad and address, needed to join and for swaps. */
export const HomeForm = ({ onSaved }: { readonly onSaved?: () => void }) => {
  const t = useTranslations("app.plus.join");
  const tDays = useTranslations("app.plus.weekdays");
  const locale = useLocale();
  const id = useId();
  const { user } = useAuth();
  const areas = usePlusAreas().data ?? [];
  const home = usePlusHome().data;
  const { setHome } = usePlusActions();
  const [areaId, setAreaId] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const chosenArea = areaId ?? home?.area_id ?? "";
  const chosenAddress = address ?? home?.address ?? "";
  const chosenPhone = phone ?? home?.phone ?? accountPhone(user?.phone);
  const area = areas.find((item) => item.id === chosenArea);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizePhone(chosenPhone);
    if (!(chosenArea && chosenAddress.trim() && normalized)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setHome.mutate(
      { address: chosenAddress, areaId: chosenArea, phone: normalized },
      { onSuccess: onSaved }
    );
  };

  return (
    <form className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={save}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-area`}>{t("area")}</Label>
        <Select onValueChange={setAreaId} value={chosenArea}>
          <SelectTrigger className="w-full" id={`${id}-area`}>
            <SelectValue placeholder={t("areaPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {areas.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {localized(item, "name", locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {area ? (
          <p className="text-muted-foreground text-xs">
            {area.weekday === null
              ? t("dayLater")
              : t("day", { day: tDays(WEEKDAYS[area.weekday] ?? "sunday") })}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-phone`}>{t("phone")}</Label>
        <Input
          autoComplete="tel"
          className="text-start"
          dir="ltr"
          id={`${id}-phone`}
          inputMode="tel"
          onChange={(event) => setPhone(event.target.value)}
          type="tel"
          value={chosenPhone}
        />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={`${id}-address`}>{t("address")}</Label>
        <Textarea
          autoComplete="street-address"
          id={`${id}-address`}
          maxLength={500}
          onChange={(event) => setAddress(event.target.value)}
          rows={2}
          value={chosenAddress}
        />
      </div>
      {invalid || setHome.isError ? (
        <p className="text-destructive text-sm sm:col-span-2" role="alert">
          {t("homeInvalid")}
        </p>
      ) : null}
      <Button
        className="justify-self-start"
        disabled={setHome.isPending}
        type="submit"
        variant="outline"
      >
        {setHome.isPending ? t("saving") : t("saveHome")}
      </Button>
    </form>
  );
};

/** The waitlist for people outside Baghdad, or when Plus is full. */
const WaitlistForm = ({
  governorate,
  onGovernorate,
}: {
  readonly governorate: string;
  readonly onGovernorate: (value: string) => void;
}) => {
  const t = useTranslations("app.plus.join");
  const locale = useLocale();
  const id = useId();
  const zones = useDeliveryZones().data ?? [];
  const { joinWaitlist } = usePlusActions();
  const governorates = [
    ...new Set(zones.map((zone) => zone.governorate).filter(Boolean)),
  ] as string[];

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-governorate`}>{t("governorate")}</Label>
        <Select onValueChange={onGovernorate} value={governorate}>
          <SelectTrigger className="w-56" id={`${id}-governorate`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {governorates.map((item) => (
              <SelectItem key={item} value={item}>
                {governorateName(item, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        disabled={joinWaitlist.isPending}
        onClick={() => joinWaitlist.mutate({ governorate, planId: null })}
        type="button"
        variant="outline"
      >
        {t("joinWaitlist")}
      </Button>
      {joinWaitlist.isError ? (
        <p className="w-full text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};

/** The caller's place on the waitlist, or their invite. */
const WaitlistPlace = ({ status }: { readonly status: PlusStatus }) => {
  const t = useTranslations("app.plus.join");
  const locale = useLocale();
  const { leaveWaitlist } = usePlusActions();

  if (status.waitlistStatus === "invited" && status.inviteExpiresAt) {
    return (
      <p className="rounded-md bg-surface-sunken p-3 text-sm" role="status">
        {t("invited", {
          until: formatDateTime(status.inviteExpiresAt, locale),
        })}
      </p>
    );
  }
  if (status.waitlistStatus !== "waiting") {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <p className="flex-1" role="status">
        {status.waitlistGovernorate && status.waitlistGovernorate !== BAGHDAD
          ? t("waitingOutside", {
              governorate: governorateName(status.waitlistGovernorate, locale),
              position: formatNumber(status.waitlistPosition ?? 0, locale),
            })
          : t("waiting", {
              position: formatNumber(status.waitlistPosition ?? 0, locale),
            })}
      </p>
      <Button
        disabled={leaveWaitlist.isPending}
        onClick={() => leaveWaitlist.mutate()}
        size="sm"
        type="button"
        variant="ghost"
      >
        {t("leave")}
      </Button>
    </div>
  );
};

/** How many places are left, or that Plus is full. */
const Places = ({ status }: { readonly status: PlusStatus }) => {
  const t = useTranslations("app.plus.join");
  const locale = useLocale();
  return (
    <p className="font-medium text-sm">
      {status.placesFree > 0
        ? t("placesLeft", {
            count: status.placesFree,
            n: formatNumber(status.placesFree, locale),
          })
        : t("full", { waiting: formatNumber(status.waiting, locale) })}
    </p>
  );
};

/** What a person who isn't a member yet does next. */
const NextStep = ({ status }: { readonly status: PlusStatus }) => {
  const t = useTranslations("app.plus.join");
  const [governorate, setGovernorate] = useState(BAGHDAD);
  const waitingAlready = status.waitlistStatus === "waiting";

  if (status.joinReason === "needs_home" && !waitingAlready) {
    return (
      <div className="grid gap-4">
        <WaitlistOrHome
          governorate={governorate}
          onGovernorate={setGovernorate}
        />
      </div>
    );
  }
  if (status.canJoin) {
    return <p className="text-sm">{t("choosePlan")}</p>;
  }
  if (waitingAlready) {
    return null;
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm">{t("fullHelp")}</p>
      <WaitlistForm governorate={governorate} onGovernorate={setGovernorate} />
    </div>
  );
};

/** In Baghdad: the home form; elsewhere: the waitlist for the governorate. */
const WaitlistOrHome = ({
  governorate,
  onGovernorate,
}: {
  readonly governorate: string;
  readonly onGovernorate: (value: string) => void;
}) => {
  const t = useTranslations("app.plus.join");
  return (
    <>
      <p className="text-sm">{t("baghdadFirst")}</p>
      {governorate === BAGHDAD ? (
        <>
          <HomeForm />
          <Button
            className="justify-self-start px-0"
            onClick={() => onGovernorate("")}
            type="button"
            variant="link"
          >
            {t("notBaghdad")}
          </Button>
        </>
      ) : (
        <WaitlistForm governorate={governorate} onGovernorate={onGovernorate} />
      )}
    </>
  );
};

/**
 * Joining The IDEA Plus (on /plus/plans): places left, the member's area in
 * Baghdad, and the waitlist when Plus is full or for other governorates.
 */
export const JoinPlus = () => {
  const t = useTranslations("app.plus.join");
  const status = usePlusStatus().data;

  if (!status || status.joinReason === "member") {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPinIcon aria-hidden="true" className="size-5 text-pink-text" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Places status={status} />
        {status.joinReason === "signed_out" ? null : (
          <>
            <WaitlistPlace status={status} />
            <NextStep status={status} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
