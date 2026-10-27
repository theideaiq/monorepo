"use client";

import { formatPhone, isIraqiMobile, normalizePhone } from "@repo/auth/phone";
import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { SectionSpinner } from "@/components/states";
import { queryKeys, requireUserId, unwrap } from "@/lib/queries";

/** An Iraqi mobile number in E.164 (+964…), or null. */
const contactPhone = (value: string) => {
  const e164 = normalizePhone(value);
  return e164 && isIraqiMobile(e164) ? e164 : null;
};

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

type Problem = "phone" | "phoneRequired";

/** What to store: the number in E.164 (or none) and the consent. */
export const whatsappUpdate = (
  phoneInput: string,
  optIn: boolean
): { problem: Problem } | { optIn: boolean; phone: string | null } => {
  const trimmed = phoneInput.trim();
  if (!trimmed) {
    return optIn ? { problem: "phoneRequired" } : { optIn, phone: null };
  }
  const phone = contactPhone(trimmed);
  return phone ? { optIn, phone } : { problem: "phone" };
};

const WhatsAppForm = ({ initial }: { readonly initial: WhatsAppSettings }) => {
  const t = useTranslations("app.settings.whatsapp");
  const tCommon = useTranslations("common");
  const id = useId();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState(
    initial.phone ? formatPhone(initial.phone, "national") : ""
  );
  const [optIn, setOptIn] = useState(initial.optIn);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async (values: { optIn: boolean; phone: string | null }) => {
      unwrap(
        await supabase
          .from("profiles")
          .update({
            whatsapp_opt_in: values.optIn,
            whatsapp_phone: values.phone,
          })
          .eq("id", requireUserId(user?.id))
      );
    },
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.whatsappSettings(user?.id ?? ""),
      });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);
    const result = whatsappUpdate(phone, optIn);
    if ("problem" in result) {
      setProblem(result.problem);
      return;
    }
    setProblem(null);
    save.mutate(result);
  };

  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-phone`}>{t("phone")}</Label>
        <Input
          autoComplete="tel"
          dir="ltr"
          id={`${id}-phone`}
          inputMode="tel"
          maxLength={20}
          onChange={(event) => setPhone(event.target.value)}
          placeholder={t("phonePlaceholder")}
          type="tel"
          value={phone}
        />
      </div>
      <div className="flex items-start gap-3 rounded-md border p-3">
        <Checkbox
          aria-describedby={`${id}-hint`}
          checked={optIn}
          id={`${id}-opt-in`}
          onCheckedChange={(checked) => setOptIn(checked === true)}
        />
        <div className="grid gap-1">
          <Label htmlFor={`${id}-opt-in`}>{t("optIn")}</Label>
          <p className="text-muted-foreground text-xs" id={`${id}-hint`}>
            {t("optInHint")}
          </p>
        </div>
      </div>
      {problem ? (
        <p className="text-destructive text-sm" role="alert">
          {t(`problems.${problem}`)}
        </p>
      ) : null}
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

/** Settings card: order updates on WhatsApp, with the customer's consent. */
export const WhatsAppSettingsCard = () => {
  const t = useTranslations("app.settings.whatsapp");
  const settings = useWhatsAppSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {settings.data ? (
          <WhatsAppForm initial={settings.data} />
        ) : (
          <SectionSpinner />
        )}
      </CardContent>
    </Card>
  );
};
