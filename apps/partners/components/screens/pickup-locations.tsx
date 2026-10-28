"use client";

import { normalizePhone } from "@repo/auth/phone";
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
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useSeller } from "@/lib/seller-queries";
import {
  type LocationInput,
  type ShopLocation,
  useAreas,
  useSaveLocation,
  useSetLocationActive,
  useShopLocations,
  useSyncLocation,
} from "@/lib/shop-order-queries";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

/** A branch's details: what the courier needs to collect parcels there. */
const LocationForm = ({
  initial,
  onDone,
  sellerId,
}: {
  readonly initial?: ShopLocation;
  readonly onDone: () => void;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.pickup");
  const id = useId();
  const areas = useAreas();
  const save = useSaveLocation(sellerId);
  const [form, setForm] = useState({
    address: initial?.address ?? "",
    contact_name: initial?.contact_name ?? "",
    contact_phone: initial?.contact_phone ?? "",
    lat: initial ? String(initial.lat) : "",
    lng: initial ? String(initial.lng) : "",
    name: initial?.name ?? "",
    region_id: initial?.region_id ?? "",
  });
  const set = (key: keyof typeof form) => (value: string) =>
    setForm({ ...form, [key]: value });
  const phone = normalizePhone(form.contact_phone);
  const lat = Number(form.lat);
  const lng = Number(form.lng);
  const valid =
    form.name.trim() &&
    form.contact_name.trim() &&
    phone &&
    form.address.trim().length >= 5 &&
    form.region_id &&
    form.lat.trim() &&
    form.lng.trim() &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(valid && phone)) {
      return;
    }
    const input: LocationInput = {
      address: form.address.trim(),
      contact_name: form.contact_name.trim(),
      contact_phone: phone,
      lat,
      lng,
      name: form.name.trim(),
      region_id: form.region_id,
    };
    save.mutate({ id: initial?.id, input }, { onSuccess: onDone });
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-name`}>{t("name")}</Label>
          <Input
            id={`${id}-name`}
            maxLength={80}
            onChange={(event) => set("name")(event.target.value)}
            placeholder={t("namePlaceholder")}
            required
            value={form.name}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-area`}>{t("area")}</Label>
          <select
            className={selectClassName}
            id={`${id}-area`}
            onChange={(event) => set("region_id")(event.target.value)}
            required
            value={form.region_id}
          >
            <option value="">{t("chooseArea")}</option>
            {(areas.data ?? []).map((area) => (
              <option key={area.id} value={area.id}>
                {area.name} · {area.province}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-contact`}>{t("contactName")}</Label>
          <Input
            id={`${id}-contact`}
            maxLength={120}
            onChange={(event) => set("contact_name")(event.target.value)}
            required
            value={form.contact_name}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-phone`}>{t("contactPhone")}</Label>
          <Input
            dir="ltr"
            id={`${id}-phone`}
            inputMode="tel"
            onChange={(event) => set("contact_phone")(event.target.value)}
            placeholder="0770 123 4567"
            required
            value={form.contact_phone}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-address`}>{t("address")}</Label>
        <Textarea
          id={`${id}-address`}
          maxLength={300}
          onChange={(event) => set("address")(event.target.value)}
          required
          rows={2}
          value={form.address}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-lat`}>{t("lat")}</Label>
          <Input
            dir="ltr"
            id={`${id}-lat`}
            inputMode="decimal"
            onChange={(event) => set("lat")(event.target.value)}
            placeholder="33.3128"
            required
            value={form.lat}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-lng`}>{t("lng")}</Label>
          <Input
            dir="ltr"
            id={`${id}-lng`}
            inputMode="decimal"
            onChange={(event) => set("lng")(event.target.value)}
            placeholder="44.3615"
            required
            value={form.lng}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{t("mapHint")}</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!valid || save.isPending} type="submit">
          {t(initial ? "save" : "add")}
        </Button>
        <Button onClick={onDone} type="button" variant="ghost">
          {t("cancel")}
        </Button>
      </div>
      {save.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("errors.save")}
        </p>
      ) : null}
    </form>
  );
};

const LocationRow = ({
  canManage,
  location,
  sellerId,
}: {
  readonly canManage: boolean;
  readonly location: ShopLocation;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.pickup");
  const sync = useSyncLocation(sellerId);
  const toggle = useSetLocationActive(sellerId);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="p-3">
        <LocationForm
          initial={location}
          onDone={() => setEditing(false)}
          sellerId={sellerId}
        />
      </li>
    );
  }
  const synced =
    location.boxy_uid &&
    location.synced_at &&
    location.synced_at >= location.updated_at;
  return (
    <li className="flex flex-wrap items-start gap-3 p-3">
      <MapPinIcon aria-hidden="true" className="mt-1 size-4 shrink-0" />
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="font-medium">{location.name}</p>
        <p className="text-muted-foreground text-sm">{location.address}</p>
        <p className="text-sm">
          {location.contact_name} ·{" "}
          <span dir="ltr">{location.contact_phone}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {location.active ? null : (
          <Badge variant="secondary">{t("inactive")}</Badge>
        )}
        <Badge variant={synced ? "secondary" : "destructive"}>
          {t(synced ? "withBoxy" : "notWithBoxy")}
        </Badge>
        {canManage && !synced ? (
          <Button
            disabled={sync.isPending}
            onClick={() => sync.mutate(location.id)}
            size="sm"
            variant="outline"
          >
            {t("sendToBoxy")}
          </Button>
        ) : null}
        {canManage ? (
          <>
            <Button onClick={() => setEditing(true)} size="sm" variant="ghost">
              {t("edit")}
            </Button>
            <Button
              disabled={toggle.isPending}
              onClick={() =>
                toggle.mutate({ active: !location.active, id: location.id })
              }
              size="sm"
              variant="ghost"
            >
              {t(location.active ? "deactivate" : "activate")}
            </Button>
          </>
        ) : null}
      </div>
      {sync.isError ? (
        <p className="w-full text-destructive text-sm" role="alert">
          {t("errors.sync")}
        </p>
      ) : null}
    </li>
  );
};

const PickupBody = () => {
  const t = useTranslations("app.company.pickup");
  const { active, canManage } = useActiveOrganization();
  const shop = useSeller(active.id);
  const sellerId = shop.data?.seller.id ?? "";
  const locations = useShopLocations(sellerId);
  const [adding, setAdding] = useState(false);

  if (shop.isPending || (sellerId && locations.isPending)) {
    return <SectionSpinner />;
  }
  if (shop.isError || locations.isError) {
    return (
      <ErrorState
        onRetry={() => (shop.isError ? shop.refetch() : locations.refetch())}
      />
    );
  }
  if (shop.data?.seller.status !== "approved") {
    return <p className="text-muted-foreground">{t("notApproved")}</p>;
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {(locations.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("none")}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {(locations.data ?? []).map((location) => (
              <LocationRow
                canManage={canManage}
                key={location.id}
                location={location}
                sellerId={sellerId}
              />
            ))}
          </ul>
        )}
        {canManage && adding ? (
          <LocationForm onDone={() => setAdding(false)} sellerId={sellerId} />
        ) : null}
        {canManage && !adding ? (
          <Button
            className="justify-self-start"
            onClick={() => setAdding(true)}
            variant="outline"
          >
            {t("addBranch")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};

/**
 * Partners → Selling → Pickup: the shop's branches, each a Boxy pickup
 * location with the contact the courier calls to collect parcels.
 */
export const PickupLocations = () => (
  <BusinessShell feature="selling">
    <PickupBody />
  </BusinessShell>
);
