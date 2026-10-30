"use client";

import { formatPhone } from "@repo/auth/phone";
import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { SectionSpinner } from "@/components/states";
import { useVerifiedPhones } from "@/components/verify-phone";
import { queryKeys, requireUserId, unwrap, useProfile } from "@/lib/queries";

interface WhatsAppSettings {
  optIn: boolean;
  phone: string | null;
}

/** The caller's WhatsApp number and consent (my_whatsapp_settings()). */
export const useWhatsAppSettings = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async (): Promise<WhatsAppSettings> => {
      const rows = unwrap(await supabase.rpc("my_whatsapp_settings"));
      const row = rows?.[0];
      return { optIn: row?.opt_in ?? false, phone: row?.phone ?? null };
    },
    queryKey: queryKeys.whatsappSettings(user?.id ?? ""),
  });
};

/**
 * Which verified number updates go to: the one already chosen while it is
 * still verified, else the most recently verified one.
 */
export const updatesPhone = (
  chosen: string | null,
  verified: readonly string[]
): string | null =>
  chosen && verified.includes(chosen) ? chosen : (verified[0] ?? null);

const MessagesForm = ({
  initial,
  marketing: initialMarketing,
  verified,
}: {
  readonly initial: WhatsAppSettings;
  readonly marketing: boolean;
  readonly verified: readonly string[];
}) => {
  const t = useTranslations("app.settings.messages");
  const tCommon = useTranslations("common");
  const id = useId();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState(updatesPhone(initial.phone, verified));
  const [updates, setUpdates] = useState(initial.optIn && phone !== null);
  const [marketing, setMarketing] = useState(initialMarketing);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      unwrap(
        await supabase
          .from("profiles")
          .update({
            marketing_opt_in: marketing,
            whatsapp_opt_in: updates && phone !== null,
            whatsapp_phone: phone,
          })
          .eq("id", requireUserId(user?.id))
      );
    },
    onSuccess: async () => {
      setSaved(true);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.whatsappSettings(user?.id ?? ""),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.profile(user?.id ?? ""),
        }),
      ]);
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);
    save.mutate();
  };

  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <div className="grid gap-3 rounded-md border p-3">
        <div className="flex items-start gap-3">
          <Checkbox
            aria-describedby={`${id}-updates-hint`}
            checked={updates}
            disabled={verified.length === 0}
            id={`${id}-updates`}
            onCheckedChange={(checked) => setUpdates(checked === true)}
          />
          <div className="grid gap-1">
            <Label htmlFor={`${id}-updates`}>{t("updates")}</Label>
            <p
              className="text-muted-foreground text-xs"
              id={`${id}-updates-hint`}
            >
              {verified.length === 0 ? t("verifyFirst") : t("updatesHint")}
            </p>
          </div>
        </div>
        {updates && verified.length > 1 ? (
          <div className="grid gap-2 ps-7">
            <Label htmlFor={`${id}-phone`}>{t("number")}</Label>
            <Select
              onValueChange={(value) => setPhone(value)}
              value={phone ?? undefined}
            >
              <SelectTrigger className="max-w-56" dir="ltr" id={`${id}-phone`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {verified.map((number) => (
                  <SelectItem dir="ltr" key={number} value={number}>
                    {formatPhone(number)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <div className="flex items-start gap-3 rounded-md border p-3">
        <Checkbox
          aria-describedby={`${id}-marketing-hint`}
          checked={marketing}
          id={`${id}-marketing`}
          onCheckedChange={(checked) => setMarketing(checked === true)}
        />
        <div className="grid gap-1">
          <Label htmlFor={`${id}-marketing`}>{t("marketing")}</Label>
          <p
            className="text-muted-foreground text-xs"
            id={`${id}-marketing-hint`}
          >
            {t("marketingHint")}
          </p>
        </div>
      </div>
      {save.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
      {saved ? (
        <p className="text-muted-foreground text-sm" role="status">
          {tCommon("saved")}
        </p>
      ) : null}
      <Button
        className="justify-self-start"
        disabled={save.isPending}
        type="submit"
      >
        {save.isPending ? tCommon("saving") : tCommon("save")}
      </Button>
    </form>
  );
};

/**
 * Pass → Settings → Phone: what we send besides the codes. WhatsApp
 * updates go to a verified number and cover what Boxy (delivery, on
 * WhatsApp itself) and Wayl (no messages to customers) don't; news and
 * offers are the marketing consent (profiles.marketing_opt_in).
 */
export const MessagesSettings = () => {
  const t = useTranslations("app.settings.messages");
  const settings = useWhatsAppSettings();
  const phones = useVerifiedPhones();
  const profile = useProfile();

  return (
    <div className="grid gap-3 border-t pt-4">
      <h3 className="font-medium">{t("title")}</h3>
      {settings.data && phones.data && profile.data ? (
        <MessagesForm
          initial={settings.data}
          // Re-start the form when a number is verified or removed.
          key={phones.data.map(({ phone }) => phone).join()}
          marketing={profile.data.marketing_opt_in}
          verified={phones.data.map(({ phone }) => phone)}
        />
      ) : (
        <SectionSpinner />
      )}
    </div>
  );
};
