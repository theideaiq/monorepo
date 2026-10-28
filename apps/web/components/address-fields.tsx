"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import type { MapPin } from "@/lib/address";
import { currentPin, pinInIraq, pinLink } from "@/lib/address-book";

interface FieldProps {
  readonly children: ReactNode;
  readonly error?: string | null;
  readonly hint?: string;
  readonly htmlFor: string;
  readonly label: string;
  readonly optional?: boolean;
}

/** A labelled form field with its hint or error. */
export const Field = ({
  children,
  error,
  hint,
  htmlFor,
  label,
  optional,
}: FieldProps) => {
  const t = useTranslations("common");
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground text-xs">
            ({t("optional")})
          </span>
        ) : null}
      </Label>
      {children}
      {hint && !error ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-destructive text-xs" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
};

interface LandmarkFieldsProps {
  readonly disabled?: boolean;
  readonly id: string;
  readonly landmark: string;
  readonly location: MapPin | null;
  readonly onLandmark: (value: string) => void;
  readonly onLocation: (value: MapPin | null) => void;
}

/** The nearest landmark and a map pin from the device (both optional). */
export const LandmarkFields = ({
  disabled,
  id,
  landmark,
  location,
  onLandmark,
  onLocation,
}: LandmarkFieldsProps) => {
  const t = useTranslations("app.checkout.address");
  const [state, setState] = useState<"failed" | "idle" | "outside" | "wait">(
    "idle"
  );

  const pin = () => {
    setState("wait");
    currentPin()
      .then((value) => {
        if (pinInIraq(value)) {
          onLocation(value);
          setState("idle");
        } else {
          setState("outside");
        }
      })
      .catch(() => setState("failed"));
  };

  return (
    <>
      <div className="sm:col-span-2">
        <Field htmlFor={`${id}-landmark`} label={t("landmark")} optional>
          <Input
            disabled={disabled}
            id={`${id}-landmark`}
            maxLength={200}
            onChange={(event) => onLandmark(event.target.value)}
            placeholder={t("landmarkPlaceholder")}
            value={landmark}
          />
        </Field>
      </div>
      <div className="grid gap-2 sm:col-span-2">
        {location ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon
                aria-hidden="true"
                className="size-4 text-pink-text"
              />
              {t("pinned")}
            </span>
            <a
              className="underline underline-offset-2"
              href={pinLink(location)}
              rel="noopener"
              target="_blank"
            >
              {t("pinView")}
            </a>
            <button
              className="text-muted-foreground underline underline-offset-2"
              disabled={disabled}
              onClick={() => onLocation(null)}
              type="button"
            >
              {t("pinRemove")}
            </button>
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={disabled || state === "wait"}
              onClick={pin}
              size="sm"
              type="button"
              variant="outline"
            >
              <MapPinIcon />
              {t("pin")}
            </Button>
            <span className="text-muted-foreground text-xs">
              {t("pinHint")}
            </span>
          </div>
        )}
        {state === "failed" || state === "outside" ? (
          <p className="text-destructive text-xs" role="alert">
            {t(state === "failed" ? "pinFailed" : "pinOutside")}
          </p>
        ) : null}
      </div>
    </>
  );
};
