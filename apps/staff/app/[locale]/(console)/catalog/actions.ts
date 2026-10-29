"use server";

import { HOUSE_SELLER_ID } from "@repo/commerce";
import { Constants } from "@repo/database";
import { z } from "zod";
import { affected, check, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { planSchema, productSchema } from "@/lib/admin/catalog";
import {
  checkbox,
  dateTime,
  int,
  keyValues,
  optionalInt,
  optionalText,
  optionalUuid,
  slug,
  text,
  uuid,
} from "@/lib/admin/forms";

const { Enums } = Constants.public;

export const saveProduct = staffAction(
  "catalog",
  productSchema,
  async ({ input, supabase }) => {
    const row = {
      age_rating: input.ageRating,
      category_id: input.categoryId,
      condition: input.condition,
      description_ar: input.descriptionAr,
      description_en: input.descriptionEn,
      details: keyValues(input.detailKey, input.detailValue),
      featured: input.featured,
      images: input.images,
      kind: input.kind,
      name_ar: input.nameAr,
      name_en: input.nameEn,
      price: input.price,
      release_date: input.releaseDate,
      rental_tier: input.rentalTier,
      seller: input.seller,
      slug: input.slug,
      status: input.status,
      stock_count: input.stock,
      verified: input.verified,
    };

    if (input.id) {
      // With several variants, price and stock are set on each variant
      // (the product's are derived), so the form doesn't send them.
      const { count } = check(
        await supabase
          .from("product_variants")
          .select("id", { count: "exact", head: true })
          .eq("product_id", input.id)
      );
      const { price: _price, stock_count: _stock, ...shared } = row;
      affected(
        await supabase
          .from("products")
          .update((count ?? 0) > 1 ? shared : row)
          .eq("id", input.id)
          .select("id")
      );
      return success();
    }

    const { data } = check(
      await supabase.from("products").insert(row).select("id").single()
    );
    return success("saved", { redirectTo: `/catalog/products/${data?.id}` });
  }
);

export const deleteProduct = staffAction(
  "catalog",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.from("products").delete().eq("id", input.id));
    return success("deleted", { redirectTo: "/catalog" });
  }
);

const variantSchema = z.object({
  active: checkbox,
  attrKey: z.array(z.string()).optional(),
  attrValue: z.array(z.string()).optional(),
  barcode: optionalText(64),
  id: optionalUuid,
  labelAr: optionalText(60),
  labelEn: optionalText(60),
  position: int(0, 10_000),
  price: int(0),
  productId: uuid,
  rentalStock: int(0, 1_000_000),
  sku: optionalText(64),
  stock: int(0, 1_000_000),
});

export const saveVariant = staffAction(
  "catalog",
  variantSchema,
  async ({ input, supabase }) => {
    const attributes = keyValues(input.attrKey, input.attrValue);
    const row = {
      active: input.active,
      attributes,
      barcode: input.barcode,
      label_ar: input.labelAr ?? input.labelEn,
      label_en: input.labelEn ?? input.labelAr,
      position: input.position,
      price: input.price,
      product_id: input.productId,
      rental_stock: input.rentalStock,
      sku: input.sku,
      stock_count: input.stock,
    };
    check(
      input.id
        ? await supabase
            .from("product_variants")
            .update(row)
            .eq("id", input.id)
            .eq("product_id", input.productId)
        : await supabase.from("product_variants").insert(row)
    );
    return success();
  }
);

export const deleteVariant = staffAction(
  "catalog",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.from("product_variants").delete().eq("id", input.id));
    return success("deleted");
  }
);

const categorySchema = z.object({
  id: optionalUuid,
  nameAr: text(120),
  nameEn: text(120),
  position: int(0, 10_000),
  slug: slug.max(64),
});

export const saveCategory = staffAction(
  "catalog",
  categorySchema,
  async ({ input, supabase }) => {
    const row = {
      name_ar: input.nameAr,
      name_en: input.nameEn,
      position: input.position,
      slug: input.slug,
    };
    check(
      input.id
        ? await supabase
            .from("product_categories")
            .update(row)
            .eq("id", input.id)
        : await supabase.from("product_categories").insert(row)
    );
    return success();
  }
);

export const deleteCategory = staffAction(
  "catalog",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(
      await supabase.from("product_categories").delete().eq("id", input.id)
    );
    return success("deleted");
  }
);

export const saveStoreSettings = staffAction(
  "catalog",
  z.object({
    cashOnDelivery: checkbox,
    requireVerifiedPhone: checkbox,
    shippingFee: int(0),
    surveyDailyBoosted: int(1, 100),
    surveyEarlyHours: int(0, 168),
    surveyEarlyShare: int(0, 100),
    surveyTrustedAnswers: int(1, 1000),
    surveyTrustedWindow: int(1, 100),
    waylReturnRefunds: checkbox,
  }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("store_settings")
        .update({
          cash_on_delivery_enabled: input.cashOnDelivery,
          require_verified_phone: input.requireVerifiedPhone,
          shipping_fee: input.shippingFee,
          survey_daily_boosted: input.surveyDailyBoosted,
          survey_early_hours: input.surveyEarlyHours,
          survey_early_share: input.surveyEarlyShare,
          survey_trusted_answers: input.surveyTrustedAnswers,
          survey_trusted_window: input.surveyTrustedWindow,
          wayl_return_refunds: input.waylReturnRefunds,
        })
        .eq("id", true)
        .select("id")
    );
    return success();
  }
);

export const savePlan = staffAction(
  "catalog",
  planSchema,
  async ({ input, supabase }) => {
    const row = {
      active: input.active,
      amount: input.amount,
      audience: input.audience,
      billing_interval: input.billingInterval,
      bulb_rate: input.bulbRate,
      description: input.description,
      features_ar: input.featuresAr,
      features_en: input.featuresEn,
      free_delivery: input.freeDelivery,
      name: input.name,
      name_ar: input.nameAr,
      position: input.position,
      rental_slots: input.rentalSlots,
      tier: input.tier,
    };

    if (input.isNew) {
      check(await supabase.from("plans").insert({ ...row, id: input.id }));
      return success("saved", { redirectTo: `/catalog/plans/${input.id}` });
    }

    affected(
      await supabase.from("plans").update(row).eq("id", input.id).select("id")
    );
    return success();
  }
);

const GOVERNORATE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const saveDeliveryZone = staffAction(
  "catalog",
  z
    .object({
      active: checkbox,
      fee: int(0),
      freeFrom: optionalInt(0),
      governorate: optionalText(64).refine(
        (value) => value === null || GOVERNORATE_ID.test(value)
      ),
      id: optionalUuid,
      maxDays: int(0, 60),
      minDays: int(0, 60),
      nameAr: text(120),
      nameEn: text(120),
      plusFreeDelivery: checkbox,
      position: int(0),
    })
    .refine((zone) => zone.maxDays >= zone.minDays, { path: ["maxDays"] }),
  async ({ input, supabase }) => {
    const row = {
      active: input.active,
      fee: input.fee,
      free_from: input.freeFrom,
      governorate: input.governorate,
      max_days: input.maxDays,
      min_days: input.minDays,
      name_ar: input.nameAr,
      name_en: input.nameEn,
      plus_free_delivery: input.plusFreeDelivery,
      position: input.position,
    };
    check(
      input.id
        ? await supabase.from("delivery_zones").update(row).eq("id", input.id)
        : await supabase.from("delivery_zones").insert(row)
    );
    return success();
  }
);

export const deleteDeliveryZone = staffAction(
  "catalog",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.from("delivery_zones").delete().eq("id", input.id));
    return success("deleted");
  }
);

const copyFields = {
  condition: z.enum(Enums.product_condition),
  cost: optionalInt(0),
  location: optionalText(120),
  note: optionalText(1000),
  price: optionalInt(1),
  purpose: z.enum(Enums.stock_purpose),
  serial: optionalText(120),
  variantId: uuid,
};

const copyRow = (input: {
  condition: (typeof Enums.product_condition)[number];
  cost: number | null;
  location: string | null;
  note: string | null;
  price: number | null;
  purpose: (typeof Enums.stock_purpose)[number];
  serial: string | null;
  variantId: string;
}) => ({
  condition: input.condition,
  cost: input.cost,
  location: input.location ?? "",
  note: input.note,
  price: input.price,
  purpose: input.purpose,
  serial: input.serial,
  variant_id: input.variantId,
});

/** Adds copies of a variant of a product, all alike. */
export const addCopies = staffAction(
  "catalog",
  z.object({
    ...copyFields,
    count: int(1, 100),
    productId: uuid,
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.from("stock_items").insert(
        Array.from({ length: input.count }, () => ({
          ...copyRow(input),
          product_id: input.productId,
        }))
      )
    );
    return success();
  }
);

/** Edits one copy: its variant, condition, purpose, status, place and prices. */
export const saveCopy = staffAction(
  "catalog",
  z.object({
    ...copyFields,
    id: uuid,
    status: z.enum(Enums.stock_status),
  }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("stock_items")
        .update({ ...copyRow(input), status: input.status })
        .eq("id", input.id)
        .select("id")
    );
    return success();
  }
);

export const deleteCopy = staffAction(
  "catalog",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.from("stock_items").delete().eq("id", input.id));
    return success("deleted");
  }
);

/** Whether one of The IDEA's listings takes offers, and its automatic amounts. */
export const saveHouseOfferSettings = staffAction(
  "catalog",
  z.object({
    accept: checkbox,
    acceptAt: optionalInt(1),
    condition: z.enum(Enums.product_condition),
    declineBelow: optionalInt(1),
    variantId: uuid,
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("set_offer_settings", {
        accept: input.accept,
        accept_at: input.acceptAt ?? undefined,
        decline_below: input.declineBelow ?? undefined,
        seller: HOUSE_SELLER_ID,
        variant: input.variantId,
        wanted: input.condition,
      })
    );
    return success();
  }
);

/** Accept, decline or counter (once) an offer on The IDEA's own stock. */
export const answerHouseOffer = staffAction(
  "catalog",
  z.object({
    answer: z.enum(["accept", "decline", "counter"]),
    counter: optionalInt(1),
    id: uuid,
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("answer_offer", {
        answer: input.answer,
        counter: input.counter ?? undefined,
        target: input.id,
      })
    );
    return success();
  }
);

const campaignSchema = z.object({
  descriptionAr: optionalText(2000),
  descriptionEn: optionalText(2000),
  endsAt: dateTime,
  nameAr: text(120),
  nameEn: text(120),
  published: checkbox,
  slug,
  startsAt: dateTime,
});

/** A new seasonal campaign; shops opt in once it's published. */
export const createCampaign = staffAction(
  "catalog",
  campaignSchema,
  async ({ input, supabase }) => {
    check(
      await supabase.from("campaigns").insert({
        description_ar: input.descriptionAr,
        description_en: input.descriptionEn,
        ends_at: input.endsAt,
        name_ar: input.nameAr,
        name_en: input.nameEn,
        published: input.published,
        slug: input.slug,
        starts_at: input.startsAt,
      })
    );
    return success("saved");
  }
);

export const setCampaignPublished = staffAction(
  "catalog",
  z.object({ id: uuid, published: z.enum(["true", "false"]) }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("campaigns")
        .update({ published: input.published === "true" })
        .eq("id", input.id)
        .select("id")
    );
    return success();
  }
);

/** Only drafts can be deleted; a published campaign is ended by its date. */
export const deleteCampaign = staffAction(
  "catalog",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("campaigns")
        .delete()
        .eq("id", input.id)
        .eq("published", false)
        .select("id")
    );
    return success("deleted");
  }
);

/** A sale on one of The IDEA's listings; it stays above the margin floor. */
export const setHouseSale = staffAction(
  "catalog",
  z.object({
    condition: z.enum(Enums.product_condition),
    endsAt: dateTime,
    price: int(1),
    startsAt: dateTime,
    variantId: uuid,
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("set_listing_sale", {
        ends: input.endsAt,
        price: input.price,
        seller: HOUSE_SELLER_ID,
        starts: input.startsAt,
        variant: input.variantId,
        wanted: input.condition,
      })
    );
    return success("saved");
  }
);

export const endHouseSale = staffAction(
  "catalog",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("end_listing_sale", { target: input.id }));
    return success();
  }
);

/** A share off each of The IDEA's copies from a quantity on. */
export const setHouseDeal = staffAction(
  "catalog",
  z.object({
    condition: z.enum(Enums.product_condition),
    fromQuantity: int(2, 20),
    rate: int(1, 50),
    variantId: uuid,
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("set_quantity_deal", {
        from_quantity: input.fromQuantity,
        rate: input.rate,
        seller: HOUSE_SELLER_ID,
        variant: input.variantId,
        wanted: input.condition,
      })
    );
    return success("saved");
  }
);

export const deleteHouseDeal = staffAction(
  "catalog",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("delete_quantity_deal", { target: input.id }));
    return success();
  }
);

/** A student price on one of The IDEA's listings, above the margin floor. */
export const setHouseStudentPrice = staffAction(
  "catalog",
  z.object({
    condition: z.enum(Enums.product_condition),
    price: int(1),
    variantId: uuid,
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("set_student_price", {
        price: input.price,
        seller: HOUSE_SELLER_ID,
        variant: input.variantId,
        wanted: input.condition,
      })
    );
    return success("saved");
  }
);

export const removeHouseStudentPrice = staffAction(
  "catalog",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    check(await supabase.rpc("remove_student_price", { target: input.id }));
    return success();
  }
);
