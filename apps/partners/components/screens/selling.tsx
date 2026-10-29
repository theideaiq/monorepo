"use client";

import { passOrigin } from "@repo/auth/pass";
import { formatPrice } from "@repo/commerce";
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
import { localePath } from "@repo/internationalization";
import { fileNameOf } from "@repo/storage";
import { FileUpIcon, TrashIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ChangeEvent, type FormEvent, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  isIban,
  MAX_DOCUMENTS,
  type Seller,
  type SellerDetails,
  type ShopKind,
  useAddDocument,
  useApplyToSell,
  useRemoveDocument,
  useSavePayoutDetails,
  useSeller,
  useShopLimit,
} from "@/lib/seller-queries";

/** The selling policy on the website, in the reader's language. */
const PolicyLink = () => {
  const t = useTranslations("app.company.selling");
  const locale = useLocale();
  return (
    <a
      className="text-pink-text underline"
      href={`${passOrigin()}${localePath(locale, "/legal/selling")}`}
      rel="noopener"
      target="_blank"
    >
      {t("policy")}
    </a>
  );
};

/** Owners and admins apply with the shop's name. */
const Apply = ({
  initialKind,
  initialName,
  organizationId,
}: {
  readonly initialKind: ShopKind;
  readonly initialName: string;
  readonly organizationId: string;
}) => {
  const t = useTranslations("app.company.selling");
  const id = useId();
  const apply = useApplyToSell(organizationId);
  const [name, setName] = useState(initialName);
  const [kind, setKind] = useState<ShopKind>(initialKind);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim()) {
      apply.mutate({ kind, name });
    }
  };

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-name`}>{t("shopName")}</Label>
        <Input
          id={`${id}-name`}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
        <p className="text-muted-foreground text-xs">{t("shopNameHint")}</p>
      </div>
      <fieldset className="grid gap-2">
        <legend className="font-medium text-sm">{t("kind.label")}</legend>
        {(["registered", "individual"] as const).map((value) => (
          <label
            className="flex items-start gap-2 text-sm"
            htmlFor={`${id}-${value}`}
            key={value}
          >
            <input
              checked={kind === value}
              className="mt-1"
              id={`${id}-${value}`}
              name={`${id}-kind`}
              onChange={() => setKind(value)}
              type="radio"
            />
            <span>
              <span className="font-medium">{t(`kind.${value}`)}</span>
              <span className="block text-muted-foreground text-xs">
                {t(`kind.${value}Hint`)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {apply.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
      <Button
        className="justify-self-start"
        disabled={apply.isPending}
        type="submit"
      >
        {t("apply")}
      </Button>
    </form>
  );
};

const statusVariant = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
  suspended: "destructive",
} as const;

/** Where the application stands, and what happens next. */
const Status = ({
  details,
  seller,
}: {
  readonly details: SellerDetails | null;
  readonly seller: Seller;
}) => {
  const t = useTranslations("app.company.selling");
  const locale = useLocale();
  const limit = useShopLimit(
    seller.id,
    Boolean(details) && seller.kind === "individual"
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {seller.name}
          <Badge variant={statusVariant[seller.status]}>
            {t(`status.${seller.status}`)}
          </Badge>
          {seller.kind ? (
            <Badge variant="outline">{t(`kind.${seller.kind}`)}</Badge>
          ) : null}
        </CardTitle>
        <CardDescription>{t(`next.${seller.status}`)}</CardDescription>
      </CardHeader>
      {limit.data?.limit ? (
        <CardContent className="text-sm">
          {t("kind.used", {
            limit: formatPrice(limit.data.limit, locale),
            sold: formatPrice(limit.data.sold, locale),
          })}
        </CardContent>
      ) : null}
      {details && (details.review_note || details.deposit_required > 0) ? (
        <CardContent className="grid gap-2 text-sm">
          {details.review_note ? (
            <p>
              <span className="text-muted-foreground">{t("note")} </span>
              {details.review_note}
            </p>
          ) : null}
          {details.deposit_required > 0 ? (
            <p>
              {t("deposit", {
                held: formatPrice(details.deposit_held, locale),
                required: formatPrice(details.deposit_required, locale),
              })}
            </p>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
};

/** The documents staff review: business licence, ID and the like. */
const Documents = ({
  details,
  organizationId,
}: {
  readonly details: SellerDetails;
  readonly organizationId: string;
}) => {
  const t = useTranslations("app.company.selling.documents");
  const id = useId();
  const add = useAddDocument(
    organizationId,
    details.seller_id,
    details.documents
  );
  const remove = useRemoveDocument(
    organizationId,
    details.seller_id,
    details.documents
  );
  const full = details.documents.length >= MAX_DOCUMENTS;

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      add.mutate(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {details.documents.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("none")}</p>
        ) : (
          <ul className="grid gap-2">
            {details.documents.map((path) => (
              <li
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                key={path}
              >
                <span className="truncate" dir="auto">
                  {fileNameOf(path)}
                </span>
                <Button
                  aria-label={t("remove", { name: fileNameOf(path) })}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(path)}
                  size="icon"
                  variant="ghost"
                >
                  <TrashIcon aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {add.isError || remove.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("failed")}
          </p>
        ) : null}
        <div>
          <input
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={full || add.isPending}
            id={`${id}-file`}
            onChange={pick}
            type="file"
          />
          <Button asChild disabled={full || add.isPending} variant="outline">
            <label className="cursor-pointer" htmlFor={`${id}-file`}>
              <FileUpIcon aria-hidden="true" />
              {add.isPending ? t("uploading") : t("add")}
            </label>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/** Where weekly payouts go. */
const Payout = ({
  details,
  organizationId,
}: {
  readonly details: SellerDetails;
  readonly organizationId: string;
}) => {
  const t = useTranslations("app.company.selling.payout");
  const id = useId();
  const save = useSavePayoutDetails(organizationId, details.seller_id);
  const [bank, setBank] = useState(details.payout_bank ?? "");
  const [accountName, setAccountName] = useState(
    details.payout_account_name ?? ""
  );
  const [iban, setIban] = useState(details.payout_iban ?? "");
  const ibanInvalid = iban.trim() !== "" && !isIban(iban);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ibanInvalid) {
      save.mutate({ accountName, bank, iban });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-bank`}>{t("bank")}</Label>
            <Input
              id={`${id}-bank`}
              maxLength={120}
              onChange={(event) => setBank(event.target.value)}
              value={bank}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-holder`}>{t("accountName")}</Label>
            <Input
              id={`${id}-holder`}
              maxLength={120}
              onChange={(event) => setAccountName(event.target.value)}
              value={accountName}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor={`${id}-iban`}>{t("iban")}</Label>
            <Input
              aria-describedby={`${id}-iban-hint`}
              aria-invalid={ibanInvalid}
              className="text-start"
              dir="ltr"
              id={`${id}-iban`}
              onChange={(event) => setIban(event.target.value)}
              value={iban}
            />
            <p
              className={
                ibanInvalid
                  ? "text-destructive text-xs"
                  : "text-muted-foreground text-xs"
              }
              id={`${id}-iban-hint`}
            >
              {ibanInvalid ? t("ibanInvalid") : t("ibanHint")}
            </p>
          </div>
          {save.isError ? (
            <p className="text-destructive text-sm sm:col-span-2" role="alert">
              {t("failed")}
            </p>
          ) : null}
          {save.isSuccess ? (
            <p className="text-muted-foreground text-sm sm:col-span-2">
              {t("saved")}
            </p>
          ) : null}
          <Button
            className="justify-self-start"
            disabled={save.isPending}
            type="submit"
          >
            {t("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const SellingBody = () => {
  const t = useTranslations("app.company.selling");
  const { active, canManage } = useActiveOrganization();
  const shop = useSeller(active.id);

  if (shop.isPending) {
    return <SectionSpinner />;
  }
  if (shop.isError) {
    return <ErrorState onRetry={() => shop.refetch()} />;
  }
  const current = shop.data;
  const canApply = !current || current.seller.status === "rejected";

  return (
    <div className="grid max-w-3xl gap-6">
      <p className="text-muted-foreground text-sm">
        {t("intro")} <PolicyLink />
      </p>
      {current ? (
        <Status details={current.details} seller={current.seller} />
      ) : null}
      {canApply && canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {current ? t("applyAgainTitle") : t("applyTitle")}
            </CardTitle>
            <CardDescription>{t("applyDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Apply
              initialKind={current?.seller.kind ?? "individual"}
              initialName={current?.seller.name ?? active.name}
              organizationId={active.id}
            />
          </CardContent>
        </Card>
      ) : null}
      {canApply && !canManage ? (
        <p className="text-muted-foreground text-sm">{t("askManager")}</p>
      ) : null}
      {current?.details ? (
        <>
          <Documents details={current.details} organizationId={active.id} />
          <Payout details={current.details} organizationId={active.id} />
        </>
      ) : null}
    </div>
  );
};

/** Partners → Selling: the organization's shop on The IDEA. */
export const Selling = () => (
  <BusinessShell feature="selling">
    <SellingBody />
  </BusinessShell>
);
