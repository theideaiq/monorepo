"use client";

import { track } from "@repo/analytics/client";
import {
  type ContactError,
  type ContactField,
  type ContactResponse,
  contactRequestSchema,
  contactTopics,
  invalidContactFields,
  parseTopic,
} from "@repo/config/contact";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { cn } from "@repo/design-system/lib/utils";
import { MoveRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";

type Result =
  | { ok: true }
  | { error: ContactError | null; fields: ContactField[]; ok: false };

const errorCodes = new Set<ContactError>([
  "forbidden",
  "invalid",
  "rate_limited",
  "unavailable",
  "unknown",
]);

/** Posts the message to apps/api (`POST /contact`), which emails the team. */
const send = async (apiUrl: string, body: object): Promise<Result> => {
  try {
    const response = await fetch(`${apiUrl}/contact`, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const result = (await response
      .json()
      .catch(() => null)) as ContactResponse | null;
    if (response.ok && result?.ok) {
      return { ok: true };
    }
    const error =
      result && !result.ok && errorCodes.has(result.error)
        ? result.error
        : "unknown";
    const fields = result && !result.ok ? (result.fields ?? []) : [];
    // Field errors speak for themselves; no extra banner for them.
    return {
      error: error === "invalid" && fields.length > 0 ? null : error,
      fields,
      ok: false,
    };
  } catch {
    return { error: "unknown", fields: [], ok: false };
  }
};

export const ContactForm = ({
  apiUrl,
}: {
  /** NEXT_PUBLIC_API_URL; without it the form says it's unavailable. */
  readonly apiUrl: string | undefined;
}) => {
  const t = useTranslations("web.contact.form");
  const id = useId();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const initialTopic = parseTopic(searchParams.get("topic"));

  const fieldErrors = result && !result.ok ? result.fields : [];
  const fieldProps = (field: ContactField) => {
    const invalid = fieldErrors.includes(field);
    return {
      "aria-describedby": invalid ? `${id}-${field}-error` : undefined,
      "aria-invalid": invalid || undefined,
      id: `${id}-${field}`,
      name: field,
    };
  };
  const fieldError = (field: ContactField) =>
    fieldErrors.includes(field) ? (
      <p className="text-destructive text-sm" id={`${id}-${field}-error`}>
        {t(`fieldErrors.${field}`)}
      </p>
    ) : null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = {
      email: String(data.get("email") ?? "").trim(),
      message: String(data.get("message") ?? ""),
      name: String(data.get("name") ?? ""),
      topic: parseTopic(data.get("topic")),
      website: String(data.get("website") ?? "") || undefined,
    };

    // The same rules as the endpoint, so mistakes show before a round trip.
    const parsed = contactRequestSchema.safeParse(body);
    if (!parsed.success) {
      setResult({
        error: null,
        fields: invalidContactFields(parsed.error),
        ok: false,
      });
      return;
    }
    if (!apiUrl) {
      setResult({ error: "unavailable", fields: [], ok: false });
      return;
    }

    setPending(true);
    const response = await send(apiUrl, body);
    setPending(false);
    setResult(response);
    if (response.ok) {
      form.reset();
      track("generate_lead", {});
    }
  };

  const banner = (() => {
    if (!result) {
      return null;
    }
    if (result.ok) {
      return t("success");
    }
    return result.error ? t(`errors.${result.error}`) : null;
  })();

  return (
    <form
      aria-busy={pending}
      className="flex w-full flex-col gap-4 rounded-lg border bg-card p-6 md:p-8"
      noValidate
      onSubmit={submit}
    >
      <h2 className="font-semibold text-xl">{t("title")}</h2>
      <div className="grid w-full items-center gap-1">
        <Label htmlFor={`${id}-topic`}>{t("topic")}</Label>
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          defaultValue={initialTopic}
          id={`${id}-topic`}
          key={initialTopic}
          name="topic"
        >
          {contactTopics.map((topic) => (
            <option key={topic} value={topic}>
              {t(`topics.${topic}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid w-full items-center gap-1">
        <Label htmlFor={`${id}-name`}>{t("name")}</Label>
        <Input
          autoComplete="name"
          maxLength={120}
          required
          type="text"
          {...fieldProps("name")}
        />
        {fieldError("name")}
      </div>
      <div className="grid w-full items-center gap-1">
        <Label htmlFor={`${id}-email`}>{t("email")}</Label>
        <Input
          autoComplete="email"
          dir="ltr"
          maxLength={254}
          required
          type="email"
          {...fieldProps("email")}
        />
        {fieldError("email")}
      </div>
      <div className="grid w-full items-center gap-1">
        <Label htmlFor={`${id}-message`}>{t("message")}</Label>
        <Textarea
          maxLength={5000}
          required
          rows={6}
          {...fieldProps("message")}
        />
        {fieldError("message")}
      </div>
      {/* Hidden from people; bots fill it and are quietly dropped. */}
      <div aria-hidden="true" className="hidden">
        <input autoComplete="off" name="website" tabIndex={-1} type="text" />
      </div>

      {banner ? (
        <p
          className={cn(
            "text-sm",
            result?.ok ? "text-pink-text" : "text-destructive"
          )}
          role={result?.ok ? "status" : "alert"}
        >
          {banner}
        </p>
      ) : null}

      <Button className="w-full gap-4" disabled={pending} type="submit">
        {pending ? t("sending") : t("cta")}{" "}
        <MoveRight className="h-4 w-4 rtl:rotate-180" />
      </Button>
    </form>
  );
};
