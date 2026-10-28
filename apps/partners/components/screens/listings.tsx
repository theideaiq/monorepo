"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatNumber } from "@repo/internationalization/format";
import { FlagIcon, PencilIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  type CatalogMatch,
  CONDITIONS,
  type Condition,
  type Listing,
  type ListingProblem,
  looksLikeCode,
  MAX_QUANTITY,
  MIN_PRICE,
  type OfferInput,
  offerProblem,
  toListingProblem,
  useCatalogSearch,
  useCategories,
  useCreateListing,
  useFlagProduct,
  useListings,
  useSetOffer,
} from "@/lib/listing-queries";
import { useSeller } from "@/lib/seller-queries";

const toInteger = (value: string) =>
  value.trim() === "" ? Number.NaN : Number(value.replaceAll(",", ""));

interface OfferFieldsProps {
  readonly initial?: Partial<OfferInput>;
  readonly lockCondition?: boolean;
  readonly onChange: (offer: OfferInput) => void;
}

/** Condition, price, copies and the shop's own SKU. */
const OfferFields = ({
  initial,
  lockCondition = false,
  onChange,
}: OfferFieldsProps) => {
  const t = useTranslations("app.company.listings");
  const conditions = useTranslations("store.condition");
  const id = useId();
  const [condition, setCondition] = useState<Condition>(
    initial?.condition ?? "new"
  );
  const [price, setPrice] = useState(
    initial?.price === undefined ? "" : String(initial.price)
  );
  const [quantity, setQuantity] = useState(
    initial?.quantity === undefined ? "1" : String(initial.quantity)
  );
  const [sku, setSku] = useState(initial?.sku ?? "");

  const report = (next: Partial<Record<string, string>>) => {
    const values = { condition, price, quantity, sku, ...next };
    onChange({
      condition: values.condition as Condition,
      price: toInteger(values.price),
      quantity: toInteger(values.quantity),
      sku: values.sku,
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-condition`}>{t("condition")}</Label>
        <Select
          disabled={lockCondition}
          onValueChange={(value) => {
            setCondition(value as Condition);
            report({ condition: value });
          }}
          value={condition}
        >
          <SelectTrigger id={`${id}-condition`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((item) => (
              <SelectItem key={item} value={item}>
                {conditions(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-price`}>{t("price")}</Label>
        <Input
          dir="ltr"
          id={`${id}-price`}
          inputMode="numeric"
          onChange={(event) => {
            setPrice(event.target.value);
            report({ price: event.target.value });
          }}
          value={price}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-quantity`}>{t("quantity")}</Label>
        <Input
          dir="ltr"
          id={`${id}-quantity`}
          inputMode="numeric"
          onChange={(event) => {
            setQuantity(event.target.value);
            report({ quantity: event.target.value });
          }}
          value={quantity}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-sku`}>{t("sku")}</Label>
        <Input
          dir="ltr"
          id={`${id}-sku`}
          maxLength={64}
          onChange={(event) => {
            setSku(event.target.value);
            report({ sku: event.target.value });
          }}
          value={sku}
        />
      </div>
    </div>
  );
};

const emptyOffer: OfferInput = {
  condition: "new",
  price: Number.NaN,
  quantity: 1,
  sku: "",
};

type ProblemKey = ListingProblem | "details" | "price" | "quantity";

const Problem = ({ problem }: { readonly problem: ProblemKey | null }) => {
  const t = useTranslations("app.company.listings.problems");
  const locale = useLocale();
  return problem ? (
    <p className="text-destructive text-sm" role="alert">
      {t(problem, {
        max: formatNumber(MAX_QUANTITY, locale),
        min: formatNumber(MIN_PRICE, locale),
      })}
    </p>
  ) : null;
};

/** Adds the shop's offer to a product found in the catalogue. */
const SellThis = ({
  match,
  onDone,
  sellerId,
}: {
  readonly match: CatalogMatch;
  readonly onDone: () => void;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.listings");
  const locale = useLocale();
  const setOffer = useSetOffer(sellerId);
  const [offer, setOfferInput] = useState(emptyOffer);
  const [variantId, setVariantId] = useState(match.variants[0]?.id ?? "");
  const [problem, setProblem] = useState<ProblemKey | null>(null);
  const id = useId();
  const label = (variant: CatalogMatch["variants"][number]) =>
    (locale === "ar" ? variant.labelAr : variant.labelEn) ??
    variant.labelEn ??
    t("defaultVersion");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const wrong = offerProblem(offer);
    setProblem(wrong);
    if (wrong || !variantId) {
      return;
    }
    setOffer.mutate(
      { ...offer, variantId },
      {
        onError: (error) => setProblem(toListingProblem(error)),
        onSuccess: onDone,
      }
    );
  };

  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      {match.variants.length > 1 ? (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-variant`}>{t("version")}</Label>
          <Select onValueChange={setVariantId} value={variantId}>
            <SelectTrigger id={`${id}-variant`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {match.variants.map((variant) => (
                <SelectItem key={variant.id} value={variant.id}>
                  {label(variant)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <OfferFields onChange={setOfferInput} />
      <Problem problem={problem} />
      <div className="flex gap-2">
        <Button disabled={setOffer.isPending} type="submit">
          {t("add")}
        </Button>
        <Button onClick={onDone} type="button" variant="ghost">
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
};

/** Creates a product nobody has listed, with the shop's offer. */
const CreateProduct = ({
  barcode,
  name,
  onDone,
  sellerId,
}: {
  readonly barcode: string;
  readonly name: string;
  readonly onDone: () => void;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.listings");
  const locale = useLocale();
  const id = useId();
  const categories = useCategories();
  const create = useCreateListing(sellerId);
  const [categoryId, setCategoryId] = useState("");
  const [nameEn, setNameEn] = useState(name);
  const [nameAr, setNameAr] = useState("");
  const [code, setCode] = useState(barcode);
  const [offer, setOffer] = useState(emptyOffer);
  const [problem, setProblem] = useState<ProblemKey | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(categoryId && (nameEn.trim() || nameAr.trim()))) {
      setProblem("details");
      return;
    }
    const wrong = offerProblem(offer);
    setProblem(wrong);
    if (wrong) {
      return;
    }
    create.mutate(
      {
        offer,
        product: { barcode: code, categoryId, nameAr, nameEn },
      },
      {
        onError: (error) => setProblem(toListingProblem(error)),
        onSuccess: onDone,
      }
    );
  };

  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <p className="text-muted-foreground text-sm">{t("createHint")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-category`}>{t("category")}</Label>
          <Select onValueChange={setCategoryId} value={categoryId}>
            <SelectTrigger id={`${id}-category`}>
              <SelectValue placeholder={t("chooseCategory")} />
            </SelectTrigger>
            <SelectContent>
              {(categories.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {locale === "ar" ? category.name_ar : category.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-barcode`}>{t("barcode")}</Label>
          <Input
            dir="ltr"
            id={`${id}-barcode`}
            inputMode="numeric"
            onChange={(event) => setCode(event.target.value)}
            value={code}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-name-en`}>{t("nameEn")}</Label>
          <Input
            dir="ltr"
            id={`${id}-name-en`}
            maxLength={200}
            onChange={(event) => setNameEn(event.target.value)}
            value={nameEn}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-name-ar`}>{t("nameAr")}</Label>
          <Input
            dir="rtl"
            id={`${id}-name-ar`}
            maxLength={200}
            onChange={(event) => setNameAr(event.target.value)}
            value={nameAr}
          />
        </div>
      </div>
      <OfferFields onChange={setOffer} />
      <Problem problem={problem} />
      <div className="flex gap-2">
        <Button disabled={create.isPending} type="submit">
          {t("create")}
        </Button>
        <Button onClick={onDone} type="button" variant="ghost">
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
};

/** What the search found: pick one, or create the product. */
const Matches = ({
  code,
  matches,
  onChoose,
  onCreate,
}: {
  readonly code: boolean;
  readonly matches: CatalogMatch[];
  readonly onChoose: (match: CatalogMatch) => void;
  readonly onCreate: () => void;
}) => {
  const t = useTranslations("app.company.listings");
  const locale = useLocale();
  return (
    <div className="grid gap-3">
      {matches.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {matches.map((match) => (
            <li
              className="flex items-center justify-between gap-3 p-3"
              key={match.id}
            >
              <span className="text-sm">
                {locale === "ar" ? match.nameAr : match.nameEn}
              </span>
              <Button
                onClick={() => onChoose(match)}
                size="sm"
                variant="outline"
              >
                {t("sellThis")}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          {code ? t("noCodeMatch") : t("noMatch")}
        </p>
      )}
      {code && matches.length > 0 ? null : (
        <Button
          className="justify-self-start"
          onClick={onCreate}
          variant="outline"
        >
          <PlusIcon />
          {t("createOpen")}
        </Button>
      )}
    </div>
  );
};

/** Scan or type a barcode, or search by title; then sell it or create it. */
const AddListing = ({ sellerId }: { readonly sellerId: string }) => {
  const t = useTranslations("app.company.listings");
  const locale = useLocale();
  const id = useId();
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<CatalogMatch | null>(null);
  const [creating, setCreating] = useState(false);
  const search = useCatalogSearch(query);

  const reset = () => {
    setChosen(null);
    setCreating(false);
    setTyped("");
    setQuery("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChosen(null);
    setCreating(false);
    setQuery(typed);
  };

  const matches = search.data?.matches ?? [];
  const searched = Boolean(query.trim()) && search.isSuccess;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("addTitle")}</CardTitle>
        <CardDescription>{t("addDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form className="flex gap-2" onSubmit={submit}>
          <Label className="sr-only" htmlFor={`${id}-find`}>
            {t("find")}
          </Label>
          <Input
            id={`${id}-find`}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={t("findPlaceholder")}
            value={typed}
          />
          <Button disabled={typed.trim().length < 2} type="submit">
            <SearchIcon />
            {t("findButton")}
          </Button>
        </form>
        {search.isFetching ? <SectionSpinner /> : null}
        {chosen ? (
          <div className="grid gap-3 rounded-md border p-4">
            <p className="font-medium">
              {locale === "ar" ? chosen.nameAr : chosen.nameEn}
            </p>
            <SellThis match={chosen} onDone={reset} sellerId={sellerId} />
          </div>
        ) : null}
        {creating ? (
          <div className="rounded-md border p-4">
            <CreateProduct
              barcode={looksLikeCode(query) ? query : ""}
              name={looksLikeCode(query) ? "" : query}
              onDone={reset}
              sellerId={sellerId}
            />
          </div>
        ) : null}
        {searched && !chosen && !creating ? (
          <Matches
            code={search.data?.code ?? false}
            matches={matches}
            onChoose={setChosen}
            onCreate={() => setCreating(true)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
};

/** Tells staff the product's details are wrong. */
const FlagForm = ({
  onDone,
  productId,
  sellerId,
}: {
  readonly onDone: () => void;
  readonly productId: string;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.listings");
  const id = useId();
  const flag = useFlagProduct(sellerId);
  const [note, setNote] = useState("");

  if (flag.isSuccess) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        {t("flagSent")}
      </p>
    );
  }

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        flag.mutate({ note, productId });
      }}
    >
      <Label htmlFor={`${id}-note`}>{t("flagLabel")}</Label>
      <Textarea
        id={`${id}-note`}
        maxLength={1000}
        onChange={(event) => setNote(event.target.value)}
        value={note}
      />
      {flag.isError ? <Problem problem="unknown" /> : null}
      <div className="flex gap-2">
        <Button
          disabled={flag.isPending || note.trim().length < 3}
          size="sm"
          type="submit"
        >
          {t("flagSend")}
        </Button>
        <Button onClick={onDone} size="sm" type="button" variant="ghost">
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
};

/** One offer: what it is, its copies, and changing or flagging it. */
const ListingRow = ({
  canManage,
  listing,
  sellerId,
}: {
  readonly canManage: boolean;
  readonly listing: Listing;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.listings");
  const conditions = useTranslations("store.condition");
  const locale = useLocale();
  const setOffer = useSetOffer(sellerId);
  const [mode, setMode] = useState<"edit" | "flag" | null>(null);
  const [offer, setOfferInput] = useState<OfferInput>({
    condition: listing.condition,
    price: listing.price,
    quantity: listing.available,
    sku: listing.sku ?? "",
  });
  const [problem, setProblem] = useState<ProblemKey | null>(null);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const wrong = offerProblem(offer);
    setProblem(wrong);
    if (wrong) {
      return;
    }
    setOffer.mutate(
      { ...offer, variantId: listing.variant_id },
      {
        onError: (error) => setProblem(toListingProblem(error)),
        onSuccess: () => setMode(null),
      }
    );
  };

  return (
    <li className="grid gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <span className="font-medium">
            {locale === "ar" ? listing.name_ar : listing.name_en}
          </span>
          <span className="text-muted-foreground text-xs">
            {conditions(listing.condition)}
            {listing.sku ? ` · ${listing.sku}` : ""}
            {listing.barcode ? ` · ${listing.barcode}` : ""}
          </span>
        </div>
        <div className="grid justify-items-end gap-1 text-sm">
          <span className="font-medium tabular-nums">
            {formatPrice(listing.price, locale)}
          </span>
          <span className="text-muted-foreground text-xs">
            {t("copies", {
              available: formatNumber(listing.available, locale),
              sold: formatNumber(listing.sold, locale),
            })}
          </span>
          {listing.product_status === "active" ? null : (
            <Badge variant="secondary">{t("notLive")}</Badge>
          )}
        </div>
      </div>
      {mode === null ? (
        <div className="flex gap-2">
          {canManage ? (
            <Button onClick={() => setMode("edit")} size="sm" variant="outline">
              <PencilIcon />
              {t("edit")}
            </Button>
          ) : null}
          <Button onClick={() => setMode("flag")} size="sm" variant="ghost">
            <FlagIcon />
            {t("flag")}
          </Button>
        </div>
      ) : null}
      {mode === "edit" ? (
        <form className="grid gap-4" noValidate onSubmit={save}>
          <OfferFields initial={offer} lockCondition onChange={setOfferInput} />
          <p className="text-muted-foreground text-xs">{t("pauseHint")}</p>
          <Problem problem={problem} />
          <div className="flex gap-2">
            <Button disabled={setOffer.isPending} size="sm" type="submit">
              {t("save")}
            </Button>
            <Button
              onClick={() => setMode(null)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : null}
      {mode === "flag" ? (
        <FlagForm
          onDone={() => setMode(null)}
          productId={listing.product_id}
          sellerId={sellerId}
        />
      ) : null}
    </li>
  );
};

const ListingsBody = () => {
  const t = useTranslations("app.company.listings");
  const { active, canManage } = useActiveOrganization();
  const shop = useSeller(active.id);
  const sellerId = shop.data?.seller.id ?? "";
  const approved = shop.data?.seller.status === "approved";
  const listings = useListings(sellerId);

  if (shop.isPending) {
    return <SectionSpinner />;
  }
  if (shop.isError) {
    return <ErrorState onRetry={() => shop.refetch()} />;
  }
  if (!approved) {
    return <p className="text-muted-foreground">{t("notApproved")}</p>;
  }

  return (
    <div className="grid max-w-3xl gap-6">
      {canManage ? <AddListing sellerId={sellerId} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>{t("yoursTitle")}</CardTitle>
          <CardDescription>{t("yoursDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {listings.isPending ? <SectionSpinner /> : null}
          {listings.isError ? (
            <ErrorState onRetry={() => listings.refetch()} />
          ) : null}
          {listings.data?.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("none")}</p>
          ) : null}
          {listings.data && listings.data.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {listings.data.map((listing) => (
                <ListingRow
                  canManage={canManage}
                  key={listing.offer_id}
                  listing={listing}
                  sellerId={sellerId}
                />
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

/** Partners → Selling → Listings: the shop's offers. */
export const Listings = () => (
  <BusinessShell feature="selling">
    <ListingsBody />
  </BusinessShell>
);
