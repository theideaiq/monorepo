"use client";

import {
  type OtpErrorCode,
  sendPhoneVerification,
  verifyPhoneVerification,
} from "@repo/auth/otp";
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
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@repo/design-system/components/ui/radio-group";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { SectionSpinner } from "@/components/states";
import { queryKeys, unwrap } from "@/lib/queries";

/** What can go wrong, as the messages name it. */
type PhoneProblem =
  | "expired"
  | "invalid_phone"
  | "not_configured"
  | "not_iraqi"
  | "taken"
  | "too_many"
  | "unavailable"
  | "wrong_code";

const PROBLEMS: Partial<Record<OtpErrorCode, PhoneProblem>> = {
  delivery_failed: "not_configured",
  expired_code: "expired",
  invalid_code: "wrong_code",
  invalid_phone: "invalid_phone",
  phone_taken: "taken",
  rate_limited: "too_many",
};

class PhoneError extends Error {
  readonly problem: PhoneProblem;
  constructor(problem: PhoneProblem) {
    super(problem);
    this.problem = problem;
  }
}

const fail = (code: OtpErrorCode): never => {
  throw new PhoneError(PROBLEMS[code] ?? "unavailable");
};

const phoneProblem = (error: unknown): PhoneProblem =>
  error instanceof PhoneError ? error.problem : "unavailable";

/** The numbers the caller verified (verified_phones). */
export const useVerifiedPhones = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("verified_phones")
          .select("phone, verified_at")
          .order("verified_at", { ascending: false })
      ),
    queryKey: queryKeys.verifiedPhones(user?.id ?? ""),
  });
};

interface VerifyPhoneProps {
  readonly onVerified?: (phone: string) => void;
  /** The number to verify, as typed or in E.164. */
  readonly phone: string;
}

type CodeChannel = "sms" | "whatsapp";

const CHANNELS: readonly CodeChannel[] = ["whatsapp", "sms"];

/**
 * Sends a code to `phone` where the person chooses (WhatsApp, which falls
 * back to SMS, or SMS) and checks the code typed back, both through
 * Supabase Auth (a phone change); the number is then the Pass's own
 * (`verified_phones`, kept by the database).
 */
export const VerifyPhone = ({ onVerified, phone }: VerifyPhoneProps) => {
  const t = useTranslations("app.verifyPhone");
  const id = useId();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const e164 = normalizePhone(phone);
  const [sentTo, setSentTo] = useState<{
    channel: "sms" | "whatsapp";
    phone: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<CodeChannel>("whatsapp");

  const check = useMutation({
    mutationFn: async (sent: { phone: string }) => {
      const result = await verifyPhoneVerification(supabase, sent.phone, code);
      return result.ok ? result.phone : fail(result.code);
    },
    onSuccess: async (verified) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.verifiedPhones(user?.id ?? ""),
      });
      onVerified?.(verified);
    },
  });

  const start = useMutation({
    mutationFn: async () => {
      // Codes go to Iraqi mobiles only: deliveries are in Iraq.
      if (e164 && !isIraqiMobile(e164)) {
        throw new PhoneError("not_iraqi");
      }
      const result = await sendPhoneVerification(supabase, e164 ?? phone, {
        channel,
      });
      return result.ok
        ? { channel: result.value.channel, phone: result.phone }
        : fail(result.code);
    },
    onSuccess: (sent) => {
      setCode("");
      check.reset();
      setSentTo(sent);
    },
  });

  const failed = start.error ?? check.error;
  const problem = failed ? phoneProblem(failed) : null;
  const shown = e164 ? formatPhone(e164) : phone;

  if (!sentTo) {
    return (
      <div className="grid gap-2">
        <p className="text-sm">{t("intro", { phone: shown })}</p>
        <fieldset className="grid gap-2">
          <legend className="mb-1 font-medium text-sm">{t("via")}</legend>
          <RadioGroup
            className="flex flex-wrap gap-4"
            onValueChange={(value) => setChannel(value as CodeChannel)}
            value={channel}
          >
            {CHANNELS.map((option) => (
              <div className="flex items-center gap-2" key={option}>
                <RadioGroupItem id={`${id}-${option}`} value={option} />
                <Label htmlFor={`${id}-${option}`}>
                  {t(option === "whatsapp" ? "viaWhatsApp" : "viaSms")}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>
        {problem ? (
          <p className="text-destructive text-sm" role="alert">
            {t(`problems.${problem}`)}
          </p>
        ) : null}
        <Button
          className="justify-self-start"
          disabled={start.isPending || !e164}
          onClick={() => start.mutate()}
          type="button"
          variant="outline"
        >
          {start.isPending ? t("sending") : t("send")}
        </Button>
      </div>
    );
  }

  // Not a form: it sits inside the checkout's. Enter in the code field
  // checks the code instead of placing the order.
  return (
    <div className="grid gap-2">
      <p className="text-sm" role="status">
        {t(sentTo.channel === "whatsapp" ? "sentWhatsApp" : "sentSms", {
          phone: formatPhone(sentTo.phone),
        })}
      </p>
      <Label htmlFor={`${id}-code`}>{t("code")}</Label>
      <div className="flex gap-2">
        <Input
          autoComplete="one-time-code"
          className="max-w-40"
          dir="ltr"
          id={`${id}-code`}
          inputMode="numeric"
          maxLength={10}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              check.mutate(sentTo);
            }
          }}
          value={code}
        />
        <Button
          disabled={check.isPending || code.trim().length < 4}
          onClick={() => check.mutate(sentTo)}
          type="button"
        >
          {check.isPending ? t("checking") : t("verify")}
        </Button>
      </div>
      {problem ? (
        <p className="text-destructive text-sm" role="alert">
          {t(`problems.${problem}`)}
        </p>
      ) : null}
      <Button
        className="justify-self-start px-0"
        disabled={start.isPending}
        onClick={() => start.mutate()}
        type="button"
        variant="link"
      >
        {t("resend")}
      </Button>
    </div>
  );
};

/**
 * Pass → Settings → Phone: the verified numbers, with remove and add, and
 * below them (`children`) what we send to them.
 */
export const VerifiedPhonesCard = ({
  children,
}: {
  readonly children?: ReactNode;
}) => {
  const t = useTranslations("app.verifyPhone");
  const id = useId();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const phones = useVerifiedPhones();
  const [adding, setAdding] = useState("");
  const [verifying, setVerifying] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: async (phone: string) => {
      unwrap(
        await supabase.from("verified_phones").delete().eq("phone", phone)
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.verifiedPhones(user?.id ?? ""),
      }),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVerifying(adding.trim() || null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {phones.isPending ? <SectionSpinner /> : null}
        {phones.data && phones.data.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {phones.data.map(({ phone }) => (
              <li
                className="flex items-center justify-between gap-3 p-3"
                key={phone}
              >
                <span className="flex items-center gap-2 text-sm" dir="ltr">
                  <CheckIcon className="size-4 text-primary" />
                  {formatPhone(phone)}
                </span>
                <Button
                  aria-label={t("remove", { phone: formatPhone(phone) })}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(phone)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {phones.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("none")}</p>
        ) : null}
        {verifying ? (
          <VerifyPhone
            key={verifying}
            onVerified={() => {
              setAdding("");
              setVerifying(null);
            }}
            phone={verifying}
          />
        ) : (
          <form className="grid gap-2" noValidate onSubmit={submit}>
            <Label htmlFor={`${id}-phone`}>{t("add")}</Label>
            <div className="flex gap-2">
              <Input
                autoComplete="tel"
                className="max-w-56"
                dir="ltr"
                id={`${id}-phone`}
                inputMode="tel"
                maxLength={20}
                onChange={(event) => setAdding(event.target.value)}
                placeholder={t("placeholder")}
                type="tel"
                value={adding}
              />
              <Button disabled={!normalizePhone(adding)} type="submit">
                {t("continue")}
              </Button>
            </div>
          </form>
        )}
        {children}
      </CardContent>
    </Card>
  );
};
