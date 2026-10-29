"use client";

import { HOUSE_SELLER_ID } from "@repo/commerce";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/file-upload";
import {
  houseAuctionAction,
  reviewAuctionMark,
  startHouseAuction,
} from "../actions";

const DAYS = ["3", "5", "7", "10"] as const;
const MARKS = ["signed", "limited", "rare"] as const;

/**
 * Put one of The IDEA's copies of this product up for auction: Staff's
 * own photos of it (3 to 12), its condition, start price, an optional
 * hidden reserve and how long it runs.
 */
export const HouseAuctionForm = ({
  listings,
  supabaseUrl,
}: {
  /** The IDEA's listings of this product: "variant:condition" and a label. */
  readonly listings: readonly {
    condition: string;
    label: string;
    variantId: string;
  }[];
  readonly supabaseUrl: string;
}) => {
  const t = useTranslations("admin.catalog.auctions");
  const tMarks = useTranslations("app.auctions.marks");
  const [first] = listings;
  if (!first) {
    return null;
  }
  return (
    <ActionForm action={startHouseAuction} className="grid gap-4">
      <SelectField
        defaultValue={`${first.variantId}:${first.condition}`}
        label={t("listing")}
        name="listing"
        options={listings.map((listing) => ({
          label: listing.label,
          value: `${listing.variantId}:${listing.condition}`,
        }))}
      />
      <FieldGrid>
        <TextField
          dir="ltr"
          inputMode="numeric"
          label={t("startPrice")}
          name="startPrice"
        />
        <TextField
          dir="ltr"
          hint={t("reserveHint")}
          inputMode="numeric"
          label={t("reserve")}
          name="reserve"
        />
        <SelectField
          defaultValue="7"
          label={t("days")}
          name="days"
          options={DAYS.map((days) => ({
            label: t("daysOption", { days }),
            value: days,
          }))}
        />
        <SelectField
          defaultValue=""
          label={t("mark")}
          name="mark"
          options={[
            { label: t("noMark"), value: "" },
            ...MARKS.map((mark) => ({ label: tMarks(mark), value: mark })),
          ]}
        />
      </FieldGrid>
      <FileUpload
        accept="image"
        bucket="auctionPhotos"
        folder={HOUSE_SELLER_ID}
        hint={t("photosHint")}
        label={t("photos")}
        max={12}
        name="photos"
        supabaseUrl={supabaseUrl}
      />
      <TextareaField label={t("note")} name="note" rows={4} />
      <div className="flex justify-end">
        <SubmitButton>{t("start")}</SubmitButton>
      </div>
    </ActionForm>
  );
};

/** Confirm a mark, or find it wrong (it counts against the shop). */
export const MarkReviewButtons = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.catalog.auctions");
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton
        action={reviewAuctionMark}
        fields={{ correct: "true", id }}
        variant="default"
      >
        {t("markRight")}
      </ActionButton>
      <ActionButton
        action={reviewAuctionMark}
        confirm={{
          description: t("markWrongDescription"),
          title: t("markWrongTitle"),
        }}
        fields={{ correct: "false", id }}
      >
        {t("markWrong")}
      </ActionButton>
    </div>
  );
};

/** What Staff can do with one of The IDEA's auctions now. */
export const HouseAuctionActions = ({
  bids,
  id,
  secondChance,
  status,
}: {
  readonly bids: number;
  readonly id: string;
  readonly secondChance: boolean;
  readonly status: string;
}) => {
  const t = useTranslations("admin.catalog.auctions");
  return (
    <div className="flex flex-wrap gap-2">
      {status === "live" && bids === 0 ? (
        <ActionButton
          action={houseAuctionAction}
          fields={{ action: "cancel_auction", id }}
        >
          {t("cancel")}
        </ActionButton>
      ) : null}
      {status === "unpaid" && !secondChance ? (
        <ActionButton
          action={houseAuctionAction}
          fields={{ action: "offer_second_chance", id }}
          variant="default"
        >
          {t("secondChance")}
        </ActionButton>
      ) : null}
      {status === "unpaid" ? (
        <ActionButton
          action={houseAuctionAction}
          fields={{ action: "close_auction", id }}
        >
          {t("close")}
        </ActionButton>
      ) : null}
    </div>
  );
};
