import { localized } from "@repo/commerce";
import { TableCell, TableRow } from "@repo/design-system/components/ui/table";
import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import { BadgeCheckIcon, ExternalLinkIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { MaybeLink } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import type { Formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { stars } from "@/lib/admin/reviews";
import { deleteReview, setReviewStatus } from "./actions";

export interface ReviewRowData {
  comment: string | null;
  created_at: string;
  id: string;
  product_id: string;
  products: {
    id: string;
    name_ar: string;
    name_en: string;
    slug: string;
  } | null;
  rating: number;
  status: "hidden" | "published";
  user_id: string;
  verified_purchase: boolean;
}

interface ReviewRowProps {
  readonly authorName: string | null | undefined;
  readonly can: { catalog: boolean; customers: boolean; write: boolean };
  readonly format: Formatters;
  readonly locale: Locale;
  readonly review: ReviewRowData;
  /** The customer app's store, for "view in store" (no trailing slash). */
  readonly storeUrl: string | null;
}

/** The product cell: catalog link (or name), its reviews and the store page. */
const ProductCell = async ({
  catalog,
  locale,
  review,
  storeUrl,
}: {
  readonly catalog: boolean;
  readonly locale: Locale;
  readonly review: ReviewRowData;
  readonly storeUrl: string | null;
}) => {
  const t = await getTranslations("admin.reviews");
  const product = review.products;
  const name = product
    ? localized(product, "name", locale)
    : t("deletedProduct");

  return (
    <span className="grid gap-1">
      <MaybeLink
        className="truncate font-medium hover:underline"
        href={product && catalog ? `/catalog/products/${product.id}` : null}
      >
        {name}
      </MaybeLink>
      <span className="flex flex-wrap gap-3 text-muted-foreground text-xs">
        <Link
          className="hover:text-foreground"
          href={`/catalog/reviews?product=${review.product_id}`}
        >
          {t("productReviews")}
        </Link>
        {product && storeUrl ? (
          <a
            className="inline-flex items-center gap-1 hover:text-foreground"
            href={`${storeUrl}${localePath(locale, `/store/${encodeURIComponent(product.slug)}`)}`}
            rel="noopener"
            target="_blank"
          >
            {t("inStore")}
            <ExternalLinkIcon className="size-3" />
          </a>
        ) : null}
      </span>
    </span>
  );
};

/** One review with its moderation buttons. */
export const ReviewRow = async ({
  authorName,
  can,
  format,
  locale,
  review,
  storeUrl,
}: ReviewRowProps) => {
  const t = await getTranslations("admin.reviews");
  const tCommon = await getTranslations("admin.common");
  const published = review.status === "published";

  return (
    <TableRow>
      <TableCell className="max-w-56">
        <ProductCell
          catalog={can.catalog}
          locale={locale}
          review={review}
          storeUrl={storeUrl}
        />
      </TableCell>
      <TableCell>
        <span
          aria-label={t("stars", { count: format.number(review.rating) })}
          className="whitespace-nowrap text-warning"
          role="img"
        >
          {stars(review.rating)}
        </span>
      </TableCell>
      <TableCell className="min-w-56 max-w-md whitespace-normal">
        {review.comment ? (
          <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm">
            {review.comment}
          </p>
        ) : (
          <span className="text-muted-foreground">{t("noComment")}</span>
        )}
      </TableCell>
      <TableCell>
        <span className="grid gap-1">
          <MaybeLink
            href={can.customers ? `/customers/${review.user_id}` : null}
          >
            {authorName || t("unnamed")}
          </MaybeLink>
          {review.verified_purchase ? (
            <StatusBadge tone="success">
              <BadgeCheckIcon className="me-1 size-3" />
              {t("verified")}
            </StatusBadge>
          ) : null}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {format.date(review.created_at)}
      </TableCell>
      <TableCell>
        <StatusBadge tone={published ? "success" : "neutral"}>
          {t(`statuses.${review.status}`)}
        </StatusBadge>
      </TableCell>
      {can.write ? (
        <TableCell>
          <span className="flex justify-end gap-2">
            <ActionButton
              action={setReviewStatus}
              fields={{
                id: review.id,
                status: published ? "hidden" : "published",
              }}
            >
              {published ? t("hide") : t("unhide")}
            </ActionButton>
            <ActionButton
              action={deleteReview}
              confirm={{
                description: t("deleteDescription"),
                title: tCommon("deleteConfirm"),
              }}
              fields={{ id: review.id }}
              variant="ghost"
            >
              {tCommon("delete")}
            </ActionButton>
          </span>
        </TableCell>
      ) : null}
    </TableRow>
  );
};
