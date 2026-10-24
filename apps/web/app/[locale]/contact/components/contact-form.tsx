"use client";

import { track } from "@repo/analytics/client";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { cn } from "@repo/design-system/lib/utils";
import { MoveRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState, useTransition } from "react";
import { type ContactResult, contact } from "../actions/contact";
import { contactTopics, parseTopic } from "../topics";

export const ContactForm = () => {
  const t = useTranslations("web.contact.form");
  const id = useId();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<ContactResult | null>(null);
  const [pending, startTransition] = useTransition();
  const initialTopic = parseTopic(searchParams.get("topic"));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const form = event.currentTarget;

    startTransition(async () => {
      const response = await contact({
        email: String(data.get("email") ?? ""),
        message: String(data.get("message") ?? ""),
        name: String(data.get("name") ?? ""),
        topic: parseTopic(data.get("topic")),
      });
      setResult(response);
      if (response.ok) {
        form.reset();
        track("generate_lead", {});
      }
    });
  };

  return (
    <form
      className="flex w-full flex-col gap-4 rounded-xl border bg-card p-6 md:p-8"
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
          id={`${id}-name`}
          name="name"
          required
          type="text"
        />
      </div>
      <div className="grid w-full items-center gap-1">
        <Label htmlFor={`${id}-email`}>{t("email")}</Label>
        <Input
          autoComplete="email"
          dir="ltr"
          id={`${id}-email`}
          name="email"
          required
          type="email"
        />
      </div>
      <div className="grid w-full items-center gap-1">
        <Label htmlFor={`${id}-message`}>{t("message")}</Label>
        <Textarea
          id={`${id}-message`}
          maxLength={5000}
          name="message"
          required
          rows={6}
        />
      </div>

      {result ? (
        <p
          className={cn(
            "text-sm",
            result.ok ? "text-primary" : "text-destructive"
          )}
          role={result.ok ? "status" : "alert"}
        >
          {result.ok ? t("success") : t(`errors.${result.error}`)}
        </p>
      ) : null}

      <Button className="w-full gap-4" disabled={pending} type="submit">
        {pending ? t("sending") : t("cta")}{" "}
        <MoveRight className="h-4 w-4 rtl:rotate-180" />
      </Button>
    </form>
  );
};
