"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState, useTransition } from "react";
import {
  listSavedReasons,
  type ReasonKind,
  removeReason,
  type SavedReason,
  saveReason,
} from "@/lib/admin/saved-reasons";
import { TextareaField, TextField } from "./fields";

interface ReasonFieldProps {
  readonly defaultValue?: string;
  readonly hint?: ReactNode;
  /** The Inbox kind the decision belongs to; its saved reasons are offered. */
  readonly kind: ReasonKind;
  readonly label: ReactNode;
  readonly maxLength?: number;
  /** A textarea (with `rows`) instead of one line. */
  readonly multiline?: boolean;
  readonly name: string;
  readonly required?: boolean;
  readonly rows?: number;
  readonly wrapperClassName?: string;
}

/**
 * A decision's reason or note (C26): the saved reasons for this kind of
 * decision are offered under it, one tap fills the field, and what is
 * typed can be saved for next time. What is submitted is always the
 * field's text, so a saved reason can be adjusted before it is sent.
 */
export const ReasonField = ({
  defaultValue = "",
  kind,
  multiline,
  wrapperClassName,
  ...field
}: ReasonFieldProps) => {
  const t = useTranslations("admin.reasons");
  const [value, setValue] = useState(defaultValue);
  const [reasons, setReasons] = useState<SavedReason[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let current = true;
    listSavedReasons(kind)
      .then((rows) => {
        if (current) {
          setReasons(rows);
        }
      })
      .catch(() => {
        // Saved reasons are a convenience: the field works without them.
      });
    return () => {
      current = false;
    };
  }, [kind]);

  const reload = async () => setReasons(await listSavedReasons(kind));
  const text = value.trim();
  const canSave =
    text.length >= 3 && !reasons.some((reason) => reason.body === text);

  return (
    <div className={wrapperClassName ?? "grid gap-2"}>
      {multiline ? (
        <TextareaField
          {...field}
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
      ) : (
        <TextField
          {...field}
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
      )}
      {reasons.length > 0 || canSave ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {reasons.length > 0 ? (
            <span className="text-muted-foreground text-xs">{t("saved")}</span>
          ) : null}
          {reasons.map((reason) => (
            <span
              className="inline-flex max-w-full items-center rounded-full border bg-muted/40 text-xs"
              key={reason.id}
            >
              <button
                className="truncate px-2.5 py-1 hover:text-foreground"
                onClick={() => setValue(reason.body)}
                title={reason.body}
                type="button"
              >
                {reason.body}
              </button>
              {reason.removable ? (
                <button
                  aria-label={t("remove", { reason: reason.body })}
                  className="pe-1.5 text-muted-foreground hover:text-foreground"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await removeReason(reason.id);
                      await reload();
                    })
                  }
                  type="button"
                >
                  <XIcon aria-hidden="true" className="size-3" />
                </button>
              ) : null}
            </span>
          ))}
          {canSave ? (
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await saveReason(kind, text);
                  await reload();
                })
              }
              size="sm"
              type="button"
              variant="ghost"
            >
              {t("save")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
