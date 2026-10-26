"use client";

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
import { formatCalendarDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CakeIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { requireUserId, unwrap } from "@/lib/queries";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Your Pass → Settings: the member's birthday, for 25 Bulbs each year on the
 * day. Set once; support corrects it (the database refuses a change).
 */
export const BirthdayCard = () => {
  const t = useTranslations("app.settings.birthday");
  const locale = useLocale();
  const id = useId();
  const { supabase, user } = useAuth();
  const queryKey = ["birthday", user?.id ?? ""];
  // Only the member reads it (my_birthday()); co-members can't.
  const current = useQuery({
    enabled: Boolean(user),
    queryFn: async () => unwrap(await supabase.rpc("my_birthday")),
    queryKey,
  });
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const save = useMutation({
    mutationFn: async (date: string) => {
      unwrap(
        await supabase
          .from("profiles")
          .update({ birthday: date })
          .eq("id", requireUserId(user?.id))
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  if (current.isPending || current.isError) {
    return null;
  }
  const birthday = current.data;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ISO_DATE.test(value)) {
      save.mutate(value);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CakeIcon aria-hidden="true" className="size-5 text-pink-text" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {birthday ? (
          <div className="grid gap-1 text-sm">
            <span>
              {formatCalendarDate(new Date(`${birthday}T12:00:00`), locale)}
            </span>
            <span className="text-muted-foreground">{t("locked")}</span>
          </div>
        ) : (
          <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor={id}>{t("label")}</Label>
              <Input
                className="w-48"
                id={id}
                max={new Date().toISOString().slice(0, 10)}
                min="1900-01-01"
                onChange={(event) => setValue(event.target.value)}
                required
                type="date"
                value={value}
              />
            </div>
            <Button disabled={save.isPending || !value} type="submit">
              {t("save")}
            </Button>
            <p className="basis-full text-muted-foreground text-xs">
              {t("once")}
            </p>
            {save.isError ? (
              <p className="basis-full text-destructive text-sm" role="alert">
                {t("failed")}
              </p>
            ) : null}
          </form>
        )}
      </CardContent>
    </Card>
  );
};
