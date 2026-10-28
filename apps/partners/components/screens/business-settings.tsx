"use client";

import { organizationFeatures } from "@repo/auth/organizations";
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
import { useSetOrganizationFeature } from "@/lib/queries";
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
      await queryClient.invalidateQueries({ queryKey: ["my-organizations"] });
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

/** The sections the organization uses, each with Add or Remove. */
const Sections = () => {
  const t = useTranslations("app");
  const { active, canManage } = useActiveOrganization();
  const setFeature = useSetOrganizationFeature(active);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("business.sections.settingsTitle")}</CardTitle>
        <CardDescription>
          {t("business.sections.settingsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ul className="grid divide-y">
          {organizationFeatures.map((feature) => {
            const on = active.features.includes(feature);
            const section = t(`nav.${feature}`);
            return (
              <li
                className="flex items-center justify-between gap-4 py-3"
                key={feature}
              >
                <span className="grid gap-0.5">
                  <span className="font-medium">{section}</span>
                  <span className="text-muted-foreground text-sm">
                    {t(`business.sections.${feature}.description`)}
                  </span>
                </span>
                {canManage ? (
                  <Button
                    aria-label={t(
                      on
                        ? "business.sections.removeSection"
                        : "business.sections.addSection",
                      { section }
                    )}
                    disabled={setFeature.isPending}
                    onClick={() => setFeature.mutate({ feature, on: !on })}
                    size="sm"
                    variant={on ? "ghost" : "outline"}
                  >
                    {t(
                      on ? "business.sections.remove" : "business.sections.add"
                    )}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
        {canManage ? null : (
          <p className="text-muted-foreground text-sm">
            {t("business.sections.managersOnly")}
          </p>
        )}
        {setFeature.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("business.sections.failed")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

const KeyedSettings = () => {
  const { active } = useActiveOrganization();
  // Switching organization starts the form over.
  return (
    <div className="grid gap-6">
      <OrganizationSettings key={active.id} />
      <Sections />
    </div>
  );
};

export const BusinessSettings = () => (
  <BusinessShell organization>
    <KeyedSettings />
  </BusinessShell>
);
