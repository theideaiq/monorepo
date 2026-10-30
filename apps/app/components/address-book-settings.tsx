"use client";

import { formatPhone } from "@repo/auth/phone";
import { useAuth } from "@repo/auth/provider";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { PlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { Field, LandmarkFields } from "@/components/address-fields";
import { SectionSpinner } from "@/components/states";
import {
  type AddressField,
  type AddressForm,
  accountPhone,
  emptyAddress,
  validateAddress,
} from "@/lib/address";
import {
  addressLine,
  addressToForm,
  MAX_ADDRESSES,
  type SavedAddress,
  useAddresses,
  useMakeDefaultAddress,
  useRemoveAddress,
  useSaveAddress,
} from "@/lib/address-book";
import { useProfile } from "@/lib/queries";
import { useDeliveryZones } from "@/lib/store-queries";

interface AddressEditorProps {
  readonly initial: AddressForm;
  readonly initialLabel: string;
  readonly onDone: () => void;
  /** The address being changed; a new one when absent. */
  readonly savedId?: string;
}

/** Adds or changes one address. */
const AddressEditor = ({
  initial,
  initialLabel,
  onDone,
  savedId,
}: AddressEditorProps) => {
  const t = useTranslations("app");
  const locale = useLocale() as Locale;
  const id = useId();
  const zones = useDeliveryZones();
  const save = useSaveAddress();
  const [form, setForm] = useState(initial);
  const [label, setLabel] = useState(initialLabel);
  const [errors, setErrors] = useState<(AddressField | "label")[]>([]);
  const zoneList = zones.data ?? [];

  const set = (field: keyof AddressForm) => (value: string) =>
    setForm({ ...form, [field]: value });
  const fieldError = (field: AddressField | "label") => {
    if (!errors.includes(field)) {
      return null;
    }
    return field === "label"
      ? t("settings.addresses.labelMissing")
      : t(`checkout.fieldErrors.${field}`);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateAddress(form, { zones: zoneList });
    const missing = [
      ...result.errors,
      ...(label.trim() ? [] : (["label"] as const)),
    ];
    setErrors(missing);
    if (!result.shipping || missing.length > 0) {
      return;
    }
    const { shipping } = result;
    save.mutate(
      {
        id: savedId,
        input: {
          area: shipping.city,
          fullName: shipping.full_name,
          governorate: shipping.governorate,
          label,
          landmark: shipping.landmark,
          location: shipping.location ?? null,
          phone: shipping.phone,
          street: shipping.address,
          zoneId: result.zoneId,
        },
      },
      { onSuccess: onDone }
    );
  };

  return (
    <form
      className="grid gap-4 rounded-lg border p-4"
      noValidate
      onSubmit={submit}
    >
      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={save.isPending}>
        <Field
          error={fieldError("label")}
          htmlFor={`${id}-label`}
          label={t("settings.addresses.label")}
        >
          <Input
            id={`${id}-label`}
            maxLength={40}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t("settings.addresses.labelPlaceholder")}
            value={label}
          />
        </Field>
        <Field
          error={fieldError("fullName")}
          htmlFor={`${id}-name`}
          label={t("checkout.address.fullName")}
        >
          <Input
            autoComplete="name"
            id={`${id}-name`}
            maxLength={120}
            onChange={(event) => set("fullName")(event.target.value)}
            value={form.fullName}
          />
        </Field>
        <Field
          error={fieldError("phone")}
          hint={t("checkout.address.phoneHint")}
          htmlFor={`${id}-phone`}
          label={t("checkout.address.phone")}
        >
          <Input
            autoComplete="tel"
            className="text-start"
            dir="ltr"
            id={`${id}-phone`}
            inputMode="tel"
            onChange={(event) => set("phone")(event.target.value)}
            value={form.phone}
          />
        </Field>
        <Field
          error={fieldError("governorate")}
          htmlFor={`${id}-governorate`}
          label={t("checkout.address.governorate")}
        >
          <Select onValueChange={set("zoneId")} value={form.zoneId}>
            <SelectTrigger className="w-full" id={`${id}-governorate`}>
              <SelectValue
                placeholder={t("checkout.address.governoratePlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {zoneList.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {locale === "ar" ? zone.name_ar : zone.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          error={fieldError("city")}
          htmlFor={`${id}-area`}
          label={t("checkout.address.area")}
        >
          <Input
            autoComplete="address-level2"
            id={`${id}-area`}
            maxLength={60}
            onChange={(event) => set("city")(event.target.value)}
            value={form.city}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field
            error={fieldError("address")}
            htmlFor={`${id}-street`}
            label={t("checkout.address.address")}
          >
            <Textarea
              autoComplete="street-address"
              id={`${id}-street`}
              maxLength={500}
              onChange={(event) => set("address")(event.target.value)}
              placeholder={t("checkout.address.addressPlaceholder")}
              rows={2}
              value={form.address}
            />
          </Field>
        </div>
        <LandmarkFields
          id={id}
          landmark={form.landmark}
          location={form.location}
          onLandmark={set("landmark")}
          onLocation={(location) => setForm({ ...form, location })}
        />
      </fieldset>
      {save.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("settings.addresses.failed")}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={save.isPending} type="submit">
          {t("settings.addresses.save")}
        </Button>
        <Button onClick={onDone} type="button" variant="ghost">
          {t("settings.addresses.cancel")}
        </Button>
      </div>
    </form>
  );
};

/** One saved address, with Make default, Edit and Remove. */
const AddressRow = ({
  address,
  onEdit,
}: {
  readonly address: SavedAddress;
  readonly onEdit: () => void;
}) => {
  const locale = useLocale();
  const t = useTranslations("app.settings.addresses");
  const remove = useRemoveAddress();
  const makeDefault = useMakeDefaultAddress();
  const busy = remove.isPending || makeDefault.isPending;
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <address className="grid min-w-0 gap-0.5 text-sm not-italic">
        <span className="flex items-center gap-2 font-medium">
          {address.label}
          {address.is_default ? (
            <Badge variant="secondary">{t("default")}</Badge>
          ) : null}
        </span>
        <span>{addressLine(address, locale)}</span>
        {address.landmark ? (
          <span className="text-muted-foreground">{address.landmark}</span>
        ) : null}
        <span className="text-muted-foreground">
          {address.full_name} ·{" "}
          <span dir="ltr">{formatPhone(address.phone)}</span>
        </span>
      </address>
      <div className="flex flex-wrap gap-1">
        {address.is_default ? null : (
          <Button
            aria-label={t("makeDefaultLabel", { label: address.label })}
            disabled={busy}
            onClick={() => makeDefault.mutate(address.id)}
            size="sm"
            variant="ghost"
          >
            {t("makeDefault")}
          </Button>
        )}
        <Button
          aria-label={t("editLabel", { label: address.label })}
          disabled={busy}
          onClick={onEdit}
          size="sm"
          variant="ghost"
        >
          {t("edit")}
        </Button>
        <Button
          aria-label={t("removeLabel", { label: address.label })}
          disabled={busy}
          onClick={() => remove.mutate(address.id)}
          size="sm"
          variant="ghost"
        >
          {t("remove")}
        </Button>
      </div>
    </li>
  );
};

/** Pass → Settings → Addresses: the address book. */
export const AddressBookCard = () => {
  const t = useTranslations("app.settings.addresses");
  const locale = useLocale() as Locale;
  const { user } = useAuth();
  const profile = useProfile();
  const addresses = useAddresses();
  // "new", a saved address's id, or null (only the list).
  const [editing, setEditing] = useState<string | null>(null);
  const list = addresses.data ?? [];
  const current = list.find((row) => row.id === editing);

  const blank: AddressForm = {
    ...emptyAddress(accountPhone(user?.phone)),
    fullName: profile.data?.full_name ?? "",
  };

  return (
    <Card id="addresses">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {addresses.isPending ? <SectionSpinner /> : null}
        {list.length === 0 && !addresses.isPending ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : null}
        {list.length > 0 ? (
          <ul className="grid divide-y">
            {list.map((row) =>
              row.id === editing ? null : (
                <AddressRow
                  address={row}
                  key={row.id}
                  onEdit={() => setEditing(row.id)}
                />
              )
            )}
          </ul>
        ) : null}
        {editing ? (
          <AddressEditor
            initial={current ? addressToForm(current) : blank}
            initialLabel={current?.label ?? ""}
            key={editing}
            onDone={() => setEditing(null)}
            savedId={current?.id}
          />
        ) : null}
        {editing || addresses.isPending ? null : (
          <div className="grid gap-1">
            <Button
              className="justify-self-start"
              disabled={list.length >= MAX_ADDRESSES}
              onClick={() => setEditing("new")}
              variant="outline"
            >
              <PlusIcon />
              {t("add")}
            </Button>
            {list.length >= MAX_ADDRESSES ? (
              <p className="text-muted-foreground text-xs">
                {t("full", { max: formatNumber(MAX_ADDRESSES, locale) })}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
