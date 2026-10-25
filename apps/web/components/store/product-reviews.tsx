"use client";

import { useAuth } from "@repo/auth/provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { BadgeCheckIcon, EyeOffIcon, PenLineIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { ErrorState } from "@/components/states";
import { toReviewError } from "@/lib/errors";
import {
  MAX_COMMENT_LENGTH,
  useDeleteReview,
  useMyReview,
  useSaveReview,
} from "@/lib/review-queries";
import { StarInput, Stars } from "./stars";

type MyReview = NonNullable<ReturnType<typeof useMyReview>["data"]>;

const VerifiedBadge = () => {
  const t = useTranslations("app.reviews");
  return (
    <Badge className="gap-1" variant="secondary">
      <BadgeCheckIcon className="size-3.5 text-success" />
      {t("verifiedPurchase")}
    </Badge>
  );
};

const ReviewForm = ({
  onDone,
  productId,
  review,
}: {
  readonly onDone: () => void;
  readonly productId: string;
  readonly review: MyReview | null;
}) => {
  const t = useTranslations("app.reviews.form");
  const commentId = useId();
  const save = useSaveReview(productId);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [missingRating, setMissingRating] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (rating < 1) {
      setMissingRating(true);
      return;
    }
    save.mutate(
      { draft: { comment, rating }, reviewId: review?.id ?? null },
      { onSuccess: onDone }
    );
  };

  return (
    <form className="grid gap-3 rounded-lg border p-4" onSubmit={submit}>
      <h3 className="font-medium">{review ? t("editTitle") : t("title")}</h3>
      <StarInput
        onChange={(value) => {
          setRating(value);
          setMissingRating(false);
        }}
        value={rating}
      />
      {missingRating ? (
        <p className="text-destructive text-sm" role="alert">
          {t("ratingRequired")}
        </p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor={commentId}>{t("comment")}</Label>
        <Textarea
          id={commentId}
          maxLength={MAX_COMMENT_LENGTH}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t("commentPlaceholder")}
          rows={4}
          value={comment}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={save.isPending} type="submit">
          {save.isPending ? t("saving") : t("submit")}
        </Button>
        {review ? (
          <Button onClick={onDone} type="button" variant="ghost">
            {t("cancel")}
          </Button>
        ) : null}
      </div>
      {save.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t(`errors.${toReviewError(save.error)}`)}
        </p>
      ) : null}
    </form>
  );
};

const DeleteReview = ({ reviewId }: { readonly reviewId: string }) => {
  const t = useTranslations("app.reviews.mine");
  const remove = useDeleteReview();

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={remove.isPending} size="sm" variant="ghost">
            {remove.isPending ? t("deleting") : t("delete")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate(reviewId)}>
              {t("deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {remove.isError ? (
        <p className="basis-full text-destructive text-sm" role="alert">
          {t("deleteFailed")}
        </p>
      ) : null}
    </>
  );
};

/** The signed-in user's review: shown (even when hidden), edited, deleted. */
const MyReviewPanel = ({ productId }: { readonly productId: string }) => {
  const t = useTranslations("app.reviews.mine");
  const locale = useLocale();
  const mine = useMyReview(productId);
  const [editing, setEditing] = useState(false);

  if (mine.isPending) {
    return null;
  }
  if (mine.isError) {
    return <ErrorState onRetry={() => mine.refetch()} />;
  }
  const review = mine.data;
  if (!review || editing) {
    return (
      <ReviewForm
        key={review?.id ?? "new"}
        onDone={() => setEditing(false)}
        productId={productId}
        review={review}
      />
    );
  }

  return (
    <article className="grid gap-2 rounded-lg border border-primary/40 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium text-sm">{t("title")}</h3>
        <Stars value={review.rating} />
        <span className="sr-only">
          {t("rating", { rating: formatNumber(review.rating, locale) })}
        </span>
        {review.verified_purchase ? <VerifiedBadge /> : null}
      </div>
      {review.status === "hidden" ? (
        <p className="flex items-center gap-2 text-sm text-warning">
          <EyeOffIcon className="size-4 shrink-0" />
          {t("hidden")}
        </p>
      ) : null}
      {review.comment ? (
        <p className="whitespace-pre-line text-sm">{review.comment}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {formatDate(review.created_at, locale)}
        </span>
        <Button onClick={() => setEditing(true)} size="sm" variant="ghost">
          {t("edit")}
        </Button>
        <DeleteReview reviewId={review.id} />
      </div>
    </article>
  );
};

/**
 * On the product page: the signed-in customer's own review (write, edit,
 * delete), or a link to sign in first and come back here.
 */
export const WriteReview = ({ productId }: { readonly productId: string }) => {
  const t = useTranslations("app.reviews");
  const { loading, user } = useAuth();
  const locale = useLocale();
  const pathname = usePathname();

  if (loading) {
    return null;
  }
  if (user) {
    return <MyReviewPanel productId={productId} />;
  }
  return (
    <Button asChild className="w-fit gap-2" variant="outline">
      <Link
        href={{
          pathname: "/sign-in",
          query: { return_to: `/${locale}${pathname}#reviews` },
        }}
      >
        <PenLineIcon aria-hidden="true" className="size-4" />
        {t("signInToWrite")}
      </Link>
    </Button>
  );
};
