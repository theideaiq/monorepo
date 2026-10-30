"use client";

import { categoryOptions, formatPrice } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
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
import {
  EyeOffIcon,
  FlagIcon,
  PackageIcon,
  PauseIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { ListActions } from "@/components/list-actions";
import { useActiveOrganization } from "@/components/organization-provider";
import {
  PhotoPicker,
  ProductPictures,
  Step,
} from "@/components/screens/listing-photos";
import { ListingUpload } from "@/components/screens/listing-upload";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  bundleChoices,
  bundleProblem,
  type CatalogMatch,
  CONDITIONS,
  type Condition,
  type Listing,
  type ListingProblem,
  looksLikeCode,
  MAX_BUNDLE_QUANTITY,
  MAX_QUANTITY,
  MIN_PRICE,
  type OfferInput,
  offerProblem,
  toListingProblem,
  useCatalogSearch,
  useCategories,
  useCreateBundle,
  useCreateListing,
  useFlagProduct,
  useListings,
  usePauseListings,
  useSetOffer,
} from "@/lib/listing-queries";
import { useSeller } from "@/lib/seller-queries";
import { hiddenListings } from "@/lib/today";

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
    <form className="grid gap-6" noValidate onSubmit={submit}>
      <Step number={2} title={t("steps.photos")}>
        <ProductPictures
          images={match.images}
          name={locale === "ar" ? match.nameAr : match.nameEn}
        />
      </Step>
      <Step number={3} title={t("steps.offer")}>
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
      </Step>
      <Problem problem={problem} />
      <div className="flex justify-end gap-2">
        <Button onClick={onDone} type="button" variant="ghost">
          {t("cancel")}
        </Button>
        <Button disabled={setOffer.isPending} type="submit">
          {t("add")}
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
  const [photos, setPhotos] = useState<File[]>([]);
  const [problem, setProblem] = useState<ProblemKey | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (photos.length === 0) {
      return;
    }
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
        photos,
        product: { barcode: code, categoryId, nameAr, nameEn },
      },
      {
        onError: (error) => setProblem(toListingProblem(error)),
        onSuccess: onDone,
      }
    );
  };

  return (
    <form className="grid gap-6" noValidate onSubmit={submit}>
      <p className="text-muted-foreground text-sm">{t("createHint")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-category`}>{t("category")}</Label>
          <Select onValueChange={setCategoryId} value={categoryId}>
            <SelectTrigger id={`${id}-category`}>
              <SelectValue placeholder={t("chooseCategory")} />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions(categories.data ?? [], locale).map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
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
      <Step number={2} title={t("steps.photos")}>
        <PhotoPicker onChange={setPhotos} photos={photos} />
      </Step>
      <Step number={3} title={t("steps.offer")}>
        <OfferFields onChange={setOffer} />
      </Step>
      <Problem problem={problem} />
      <div className="flex justify-end gap-2">
        <Button onClick={onDone} type="button" variant="ghost">
          {t("cancel")}
        </Button>
        <Button
          disabled={create.isPending || photos.length === 0}
          type="submit"
        >
          {photos.length === 0 ? t("photos.needed") : t("create")}
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
    <Card className="scroll-mt-4" id="list">
      <CardHeader>
        <CardTitle>{t("addTitle")}</CardTitle>
        <CardDescription>{t("addDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <Step number={1} title={t("steps.find")}>
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
            <Button
              disabled={typed.trim().length < 2}
              type="submit"
              variant="outline"
            >
              <SearchIcon />
              {t("findButton")}
            </Button>
          </form>
          {search.isFetching ? <SectionSpinner /> : null}
          {chosen ? (
            <p className="font-medium">
              {locale === "ar" ? chosen.nameAr : chosen.nameEn}
            </p>
          ) : null}
          {searched && !chosen && !creating ? (
            <Matches
              code={search.data?.code ?? false}
              matches={matches}
              onChoose={setChosen}
              onCreate={() => setCreating(true)}
            />
          ) : null}
        </Step>
        {chosen ? (
          <SellThis match={chosen} onDone={reset} sellerId={sellerId} />
        ) : null}
        {creating ? (
          <CreateProduct
            barcode={looksLikeCode(query) ? query : ""}
            name={looksLikeCode(query) ? "" : query}
            onDone={reset}
            sellerId={sellerId}
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
  onSelect,
  selected = false,
  sellerId,
}: {
  readonly canManage: boolean;
  readonly listing: Listing;
  /** Ticks the row for the bulk bar (owners and admins). */
  readonly onSelect?: (selected: boolean) => void;
  readonly selected?: boolean;
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

  const name = locale === "ar" ? listing.name_ar : listing.name_en;
  return (
    <li className="grid gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {onSelect ? (
            <Checkbox
              aria-label={t("select", { name })}
              checked={selected}
              className="mt-1"
              onCheckedChange={(checked) => onSelect(checked === true)}
            />
          ) : null}
          <div className="grid gap-1">
            <span className="font-medium">{name}</span>
            <span className="text-muted-foreground text-xs">
              {conditions(listing.condition)}
              {listing.sku ? ` · ${listing.sku}` : ""}
              {listing.barcode ? ` · ${listing.barcode}` : ""}
            </span>
          </div>
        </div>
        <div className="grid justify-items-end gap-1 text-sm">
          <span className="font-medium font-mono tabular-nums">
            {formatPrice(listing.price, locale)}
          </span>
          <span className="text-muted-foreground text-xs">
            {t("copies", {
              available: formatNumber(listing.available, locale),
              sold: formatNumber(listing.sold, locale),
            })}
          </span>
          {listing.product_status === "draft" ? (
            <Badge variant="neutral">
              <EyeOffIcon aria-hidden="true" />
              {t("hiddenBadge")}
            </Badge>
          ) : null}
          {listing.product_status === "archived" ? (
            <Badge variant="secondary">{t("notLive")}</Badge>
          ) : null}
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

/** Ticks and counts of the items chosen for a bundle, by variant. */
type BundlePicks = Record<string, number>;

const BundleItems = ({
  listings,
  onChange,
  picks,
}: {
  readonly listings: readonly Listing[];
  readonly onChange: (picks: BundlePicks) => void;
  readonly picks: BundlePicks;
}) => {
  const t = useTranslations("app.company.listings.bundle");
  const locale = useLocale();
  const id = useId();
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-medium text-sm">{t("items")}</legend>
      <ul className="divide-y rounded-md border">
        {bundleChoices(listings).map((listing) => {
          const picked = picks[listing.variant_id];
          const name = locale === "ar" ? listing.name_ar : listing.name_en;
          return (
            <li
              className="flex flex-wrap items-center gap-3 p-3"
              key={listing.variant_id}
            >
              <Checkbox
                checked={picked !== undefined}
                id={`${id}-${listing.variant_id}`}
                onCheckedChange={(checked) => {
                  const next = { ...picks };
                  if (checked) {
                    next[listing.variant_id] = 1;
                  } else {
                    delete next[listing.variant_id];
                  }
                  onChange(next);
                }}
              />
              <Label
                className="flex-1 font-normal"
                htmlFor={`${id}-${listing.variant_id}`}
              >
                {name}
              </Label>
              {picked === undefined ? null : (
                <Input
                  aria-label={t("howMany", { name })}
                  className="w-20"
                  dir="ltr"
                  inputMode="numeric"
                  max={MAX_BUNDLE_QUANTITY}
                  min={1}
                  onChange={(event) =>
                    onChange({
                      ...picks,
                      [listing.variant_id]: toInteger(event.target.value),
                    })
                  }
                  type="number"
                  value={Number.isNaN(picked) ? "" : picked}
                />
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
};

/** Several of the shop's own items as one offer. */
const MakeBundle = ({
  listings,
  sellerId,
}: {
  readonly listings: readonly Listing[];
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.listings");
  const bundleText = useTranslations("app.company.listings.bundle");
  const locale = useLocale();
  const id = useId();
  const categories = useCategories();
  const create = useCreateBundle(sellerId);
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<BundlePicks>({});
  const [categoryId, setCategoryId] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [offer, setOffer] = useState(emptyOffer);
  const [photos, setPhotos] = useState<File[]>([]);
  const [problem, setProblem] = useState<ProblemKey | null>(null);

  const reset = () => {
    setOpen(false);
    setPicks({});
    setCategoryId("");
    setNameEn("");
    setNameAr("");
    setPhotos([]);
    setProblem(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (photos.length === 0) {
      return;
    }
    const wrong =
      bundleProblem(Object.values(picks)) ??
      (categoryId && (nameEn.trim() || nameAr.trim()) ? null : "details") ??
      offerProblem(offer);
    setProblem(wrong);
    if (wrong) {
      return;
    }
    create.mutate(
      {
        bundle: {
          categoryId,
          items: Object.entries(picks).map(([variantId, quantity]) => ({
            quantity,
            variantId,
          })),
          nameAr,
          nameEn,
        },
        offer,
        photos,
      },
      {
        onError: (error) => setProblem(toListingProblem(error)),
        onSuccess: reset,
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{bundleText("title")}</CardTitle>
        <CardDescription>{bundleText("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {open ? (
          <form className="grid gap-4" noValidate onSubmit={submit}>
            <BundleItems
              listings={listings}
              onChange={setPicks}
              picks={picks}
            />
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="grid gap-2">
                <Label htmlFor={`${id}-category`}>{t("category")}</Label>
                <Select onValueChange={setCategoryId} value={categoryId}>
                  <SelectTrigger id={`${id}-category`}>
                    <SelectValue placeholder={t("chooseCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions(categories.data ?? [], locale).map(
                      (option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <span className="font-medium text-sm">{t("steps.photos")}</span>
              <PhotoPicker onChange={setPhotos} photos={photos} />
            </div>
            <OfferFields onChange={setOffer} />
            <p className="text-muted-foreground text-xs">
              {bundleText("copiesHint")}
            </p>
            <Problem problem={problem} />
            <div className="flex justify-end gap-2">
              <Button onClick={reset} type="button" variant="ghost">
                {t("cancel")}
              </Button>
              <Button
                disabled={create.isPending || photos.length === 0}
                type="submit"
              >
                {photos.length === 0
                  ? t("photos.needed")
                  : bundleText("create")}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            disabled={bundleChoices(listings).length < 1}
            onClick={() => setOpen(true)}
            variant="outline"
          >
            <PackageIcon />
            {bundleText("open")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

type ListFilter = "all" | "hidden" | "live" | "paused";
const FILTERS: readonly ListFilter[] = ["all", "live", "hidden", "paused"];

const inFilter = (listing: Listing, filter: ListFilter) => {
  if (filter === "live") {
    return listing.product_status === "active" && listing.available > 0;
  }
  if (filter === "hidden") {
    return listing.product_status === "draft";
  }
  if (filter === "paused") {
    return listing.product_status === "active" && listing.available === 0;
  }
  return true;
};

/** Listings the Store hides until their product has a photo. */
const NeedsPhoto = ({
  listings,
}: {
  readonly listings: readonly Listing[];
}) => {
  const t = useTranslations("app.company.listings.hidden");
  const locale = useLocale();
  const hidden = hiddenListings(listings);
  if (hidden.length === 0) {
    return null;
  }
  return (
    <Card className="scroll-mt-4 border-warning" id="needs-photo">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOffIcon aria-hidden="true" className="size-5" />
          {t("title", { count: formatNumber(hidden.length, locale) })}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-1 text-sm">
          {hidden.map((listing) => (
            <li key={listing.product_id}>
              {locale === "ar" ? listing.name_ar : listing.name_en}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

/** The shop's listings: search · filter chips · bulk bar · rows. */
const YourListings = ({
  canManage,
  listings,
  sellerId,
}: {
  readonly canManage: boolean;
  readonly listings: readonly Listing[];
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.listings");
  const locale = useLocale();
  const id = useId();
  const pause = usePauseListings(sellerId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const term = search.trim().toLowerCase();
  const shown = listings.filter(
    (listing) =>
      inFilter(listing, filter) &&
      (!term ||
        [listing.name_en, listing.name_ar, listing.sku, listing.barcode].some(
          (value) => value?.toLowerCase().includes(term)
        ))
  );
  const chosen = listings.filter((listing) => selected.has(listing.offer_id));
  const select = (offerId: string, on: boolean) => {
    const next = new Set(selected);
    if (on) {
      next.add(offerId);
    } else {
      next.delete(offerId);
    }
    setSelected(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("yoursTitle")}</CardTitle>
        <CardDescription>{t("yoursDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {listings.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("none")}</p>
        ) : (
          <>
            <div className="grid gap-2">
              <Label className="sr-only" htmlFor={`${id}-search`}>
                {t("search")}
              </Label>
              <Input
                id={`${id}-search`}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("search")}
                type="search"
                value={search}
              />
              <fieldset className="flex flex-wrap gap-2">
                <legend className="sr-only">{t("filters.label")}</legend>
                {FILTERS.map((value) => (
                  <Button
                    aria-pressed={filter === value}
                    className="rounded-full"
                    key={value}
                    onClick={() => setFilter(value)}
                    size="sm"
                    type="button"
                    variant={filter === value ? "secondary" : "outline"}
                  >
                    {t(`filters.${value}`, {
                      count: formatNumber(
                        listings.filter((listing) => inFilter(listing, value))
                          .length,
                        locale
                      ),
                    })}
                  </Button>
                ))}
              </fieldset>
            </div>
            {chosen.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-surface-sunken p-2 text-sm">
                <span className="font-medium">
                  {t("bulk.selected", {
                    count: formatNumber(chosen.length, locale),
                  })}
                </span>
                <Button
                  className="ms-auto"
                  onClick={() => setSelected(new Set())}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {t("bulk.clear")}
                </Button>
                <Button
                  disabled={pause.isPending}
                  onClick={() =>
                    pause.mutate(chosen, {
                      onSuccess: () => setSelected(new Set()),
                    })
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <PauseIcon aria-hidden="true" />
                  {t("bulk.pause")}
                </Button>
              </div>
            ) : null}
            {pause.isError ? <Problem problem="unknown" /> : null}
            {shown.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("noneShown")}</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {shown.map((listing) => (
                  <ListingRow
                    canManage={canManage}
                    key={listing.offer_id}
                    listing={listing}
                    onSelect={
                      canManage
                        ? (on) => select(listing.offer_id, on)
                        : undefined
                    }
                    selected={selected.has(listing.offer_id)}
                    sellerId={sellerId}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
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
      {listings.data ? <NeedsPhoto listings={listings.data} /> : null}
      {canManage ? <AddListing sellerId={sellerId} /> : null}
      {canManage ? (
        <div className="scroll-mt-4" id="upload">
          <ListingUpload sellerId={sellerId} />
        </div>
      ) : null}
      {canManage && listings.data ? (
        <MakeBundle listings={listings.data} sellerId={sellerId} />
      ) : null}
      {listings.isPending ? <SectionSpinner /> : null}
      {listings.isError ? (
        <ErrorState onRetry={() => listings.refetch()} />
      ) : null}
      {listings.data ? (
        <YourListings
          canManage={canManage}
          listings={listings.data}
          sellerId={sellerId}
        />
      ) : null}
    </div>
  );
};

/** Partners → Sell → Listings: the shop's offers. */
export const Listings = () => (
  <BusinessShell
    actions={<ListActions onPage />}
    feature="selling"
    page="listings"
  >
    <ListingsBody />
  </BusinessShell>
);
