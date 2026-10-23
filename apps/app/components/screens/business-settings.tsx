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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { type OrganizationError, toOrganizationError } from "@/lib/errors";
import { isValidSlug } from "@/lib/slug";

const OrganizationSettings = () => {
  const t = useTranslations();
  const id = useId();
  const { supabase } = useAuth();
  const { active, canManage } = useActiveOrganization();
  const queryClient = useQueryClient();
  const [name, setName] = useState(active.name);
  const [slug, setSlug] = useState(active.slug);
  const [error, setError] = useState<OrganizationError | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ name: name.trim(), slug })
        .eq("id", active.id);
      if (updateError) {
        throw updateError;
      }
    },
    onError: (mutationError) => setError(toOrganizationError(mutationError)),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);
    if (!isValidSlug(slug)) {
      setError("slugInvalid");
      return;
    }
    setError(null);
    save.mutate();
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("app.business.settings.title")}</CardTitle>
        <CardDescription>
          {t("app.business.settings.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          <fieldset className="grid gap-4" disabled={!canManage}>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-name`}>
                {t("app.business.settings.name")}
              </Label>
              <Input
                id={`${id}-name`}
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-slug`}>
                {t("app.business.settings.slug")}
              </Label>
              <Input
                autoCapitalize="none"
                className="text-start"
                dir="ltr"
                id={`${id}-slug`}
                maxLength={64}
                onChange={(event) => setSlug(event.target.value.toLowerCase())}
                spellCheck={false}
                value={slug}
              />
            </div>
          </fieldset>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {t(`app.onboarding.errors.${error}`)}
            </p>
          ) : null}
          {saved ? (
            <p className="text-muted-foreground text-sm" role="status">
              {t("common.saved")}
            </p>
          ) : null}
          {canManage ? (
            <Button
              className="justify-self-start"
              disabled={save.isPending || !name.trim()}
              type="submit"
            >
              {save.isPending ? t("common.saving") : t("common.save")}
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
};

const KeyedSettings = () => {
  const { active } = useActiveOrganization();
  // Switching organization starts the form over.
  return <OrganizationSettings key={active.id} />;
};

export const BusinessSettings = () => (
  <BusinessShell>
    <KeyedSettings />
  </BusinessShell>
);
