"use client";

import { useAuth } from "@repo/auth/provider";
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
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Link } from "@repo/internationalization/navigation";
import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import {
  byPlatform,
  type CodeStatus,
  type DigitalBrand,
  useAddCodeToCart,
  useDigitalBrands,
  useInApp,
  useOrderCodes,
  useRevealCode,
  useSetStoreRegion,
  useStoreRegions,
} from "@/lib/digital-codes";
import { ErrorState, SectionSpinner } from "../states";

/** A brand's denominations, each with its price and "Add to cart". */
const BrandCard = ({ brand }: { readonly brand: DigitalBrand }) => {
  const t = useTranslations("app.codes");
  const locale = useLocale();
  const { user } = useAuth();
  const add = useAddCodeToCart();
  const name = locale === "ar" ? brand.name_ar : brand.name_en;
  const region = locale === "ar" ? brand.region_ar : brand.region_en;
  const redeem = locale === "ar" ? brand.redeem_ar : brand.redeem_en;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {name}
          <Badge variant="secondary">{region}</Badge>
        </CardTitle>
        {redeem ? <CardDescription>{redeem}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {brand.products.map((product) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              key={product.id}
            >
              <span className="font-medium" dir="ltr">
                {product.face_currency} {Number(product.face_value)}
              </span>
              <span className="flex items-center gap-3">
                <span className="tabular-nums">
                  {formatPrice(product.price, locale)}
                </span>
                {user ? (
                  <Button
                    disabled={add.isPending}
                    onClick={() => add.mutate(product.id)}
                    size="sm"
                  >
                    {add.isSuccess && add.variables === product.id ? (
                      <CheckIcon aria-hidden="true" />
                    ) : null}
                    {t("add")}
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={{
                        pathname: "/sign-in",
                        query: { return_to: "/store/codes" },
                      }}
                    >
                      {t("signIn")}
                    </Link>
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

/**
 * One platform's brands: first "Which store is your account on?", then
 * that store's codes (the answer is remembered for next time).
 */
const PlatformSection = ({
  brands,
  platform,
}: {
  readonly brands: readonly DigitalBrand[];
  readonly platform: string;
}) => {
  const t = useTranslations("app.codes");
  const locale = useLocale();
  const id = useId();
  const saved = useStoreRegions().data?.get(platform);
  const setRegion = useSetStoreRegion();
  const { user } = useAuth();
  const [local, setLocal] = useState<string | null>(null);
  const regions = [
    ...new Map(brands.map((brand) => [brand.region, brand])).values(),
  ];
  const chosen =
    local ?? saved ?? (regions.length === 1 ? regions[0]?.region : undefined);
  const shown = brands.filter((brand) => brand.region === chosen);
  const label = (brand: DigitalBrand) =>
    locale === "ar" ? brand.region_ar : brand.region_en;

  const choose = (region: string) => {
    setLocal(region);
    if (user) {
      setRegion.mutate({ platform, region });
    }
  };

  return (
    <section className="grid gap-3">
      {regions.length > 1 ? (
        <div className="grid gap-2 sm:max-w-sm">
          <Label htmlFor={id}>{t("whichStore")}</Label>
          <Select onValueChange={choose} value={chosen ?? ""}>
            <SelectTrigger id={id}>
              <SelectValue placeholder={t("chooseStore")} />
            </SelectTrigger>
            <SelectContent>
              {regions.map((brand) => (
                <SelectItem key={brand.region} value={brand.region}>
                  {label(brand)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">{t("storeHint")}</p>
        </div>
      ) : null}
      {shown.map((brand) => (
        <BrandCard brand={brand} key={brand.id} />
      ))}
    </section>
  );
};

/** Store → Gift cards and codes: on the website only. */
export const DigitalCodes = () => {
  const t = useTranslations("app.codes");
  const brands = useDigitalBrands();
  const inApp = useInApp();

  if (inApp === null) {
    return <SectionSpinner />;
  }
  if (inApp) {
    return (
      <p className="rounded-md bg-muted p-4 text-sm">{t("websiteOnly")}</p>
    );
  }
  if (brands.isPending) {
    return <SectionSpinner />;
  }
  if (brands.isError) {
    return <ErrorState onRetry={() => brands.refetch()} />;
  }
  if (brands.data.length === 0) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }
  const { other, platforms } = byPlatform(brands.data);
  return (
    <div className="grid gap-8">
      <p className="text-muted-foreground text-sm">{t("terms")}</p>
      {[...platforms.entries()].map(([platform, list]) => (
        <PlatformSection brands={list} key={platform} platform={platform} />
      ))}
      {other.map((brand) => (
        <BrandCard brand={brand} key={brand.id} />
      ))}
    </div>
  );
};

/** A code that came: hidden until the member's tap, then copyable. */
const RevealCode = ({ codeId }: { readonly codeId: string }) => {
  const t = useTranslations("app.codes.order");
  const reveal = useRevealCode();
  const [copied, setCopied] = useState(false);
  const shown = reveal.data;

  if (!shown) {
    return (
      <div className="grid gap-1">
        <Button
          disabled={reveal.isPending}
          onClick={() => reveal.mutate(codeId)}
          size="sm"
          variant="outline"
        >
          <KeyRoundIcon aria-hidden="true" />
          {t("reveal")}
        </Button>
        <span className="text-muted-foreground text-xs">{t("revealNote")}</span>
        {reveal.isError ? (
          <span className="text-destructive text-xs" role="alert">
            {t("revealFailed")}
          </span>
        ) : null}
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown.code ?? "");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid gap-1">
      <span className="flex flex-wrap items-center gap-2">
        <code
          className="rounded bg-muted px-2 py-1 font-mono text-sm"
          dir="ltr"
        >
          {shown.code}
        </code>
        <Button onClick={copy} size="sm" type="button" variant="ghost">
          {copied ? (
            <CheckIcon aria-hidden="true" />
          ) : (
            <CopyIcon aria-hidden="true" />
          )}
          {copied ? t("copied") : t("copy")}
        </Button>
      </span>
      {shown.pin ? (
        <span className="text-sm">
          {t("pin")}:{" "}
          <code className="font-mono" dir="ltr">
            {shown.pin}
          </code>
        </span>
      ) : null}
    </div>
  );
};

const STATUS_KEY: Record<
  CodeStatus,
  "cancelled" | "checking" | "preparing" | "ready" | "replaced" | "unpaid"
> = {
  buying: "preparing",
  cancelled: "cancelled",
  delivered: "ready",
  failed: "preparing",
  held: "checking",
  invalid: "replaced",
  pending: "preparing",
  unpaid: "unpaid",
};

/** Pass → Orders → an order's codes: where each is, and revealing it. */
export const OrderCodes = ({
  hasCodes,
  names,
  orderId,
}: {
  /** Whether the order has code lines (no query otherwise). */
  readonly hasCodes: boolean;
  readonly names: ReadonlyMap<string, string>;
  readonly orderId: string;
}) => {
  const t = useTranslations("app.codes.order");
  const codes = useOrderCodes(hasCodes ? orderId : "").data ?? [];
  if (codes.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {codes.map((code) => (
            <li
              className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm"
              key={code.id}
            >
              <span className="grid gap-0.5">
                <span>{names.get(code.order_item_id) ?? ""}</span>
                <span className="text-muted-foreground text-xs">
                  {t(`status.${STATUS_KEY[code.status]}`)}
                </span>
              </span>
              {code.status === "delivered" ? (
                <RevealCode codeId={code.id} />
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

/** The Store's way to gift cards and codes, hidden in the apps. */
export const CodesLink = () => {
  const t = useTranslations("app.codes");
  if (useInApp() !== false) {
    return null;
  }
  return (
    <p className="mb-6 rounded-lg border bg-muted/40 p-4 text-sm">
      <KeyRoundIcon
        aria-hidden="true"
        className="me-2 inline size-4 text-pink-text"
      />
      {t("storeLink")}{" "}
      <Link className="font-medium underline" href="/store/codes">
        {t("storeLinkAction")}
      </Link>
    </p>
  );
};
