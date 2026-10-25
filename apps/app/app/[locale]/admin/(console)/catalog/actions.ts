"use server";

import { Constants } from "@repo/database";
import { z } from "zod";
import { affected, check, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { planSchema, productSchema } from "@/lib/admin/catalog";
import {
  checkbox,
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
      category_id: input.categoryId,
      compare_at_price: input.compareAtPrice,
      condition: input.condition,
      description_ar: input.descriptionAr,
      description_en: input.descriptionEn,
      details: keyValues(input.detailKey, input.detailValue),
      featured: input.featured,
      group_key: input.groupKey,
      images: input.images,
      kind: input.kind,
      name_ar: input.nameAr,
      name_en: input.nameEn,
      price: input.price,
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
      const {
        compare_at_price: _compareAtPrice,
        price: _price,
        stock_count: _stock,
        ...shared
      } = row;
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
  compareAtPrice: optionalInt(0),
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
      compare_at_price: input.compareAtPrice,
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
  kind: z.enum(Enums.product_kind),
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
      kind: input.kind,
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
    freeShippingThreshold: optionalInt(0),
    pickupAddressAr: optionalText(500),
    pickupAddressEn: optionalText(500),
    pickupEnabled: checkbox,
    pickupHoursAr: optionalText(200),
    pickupHoursEn: optionalText(200),
    shippingFee: int(0),
  }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("store_settings")
        .update({
          cash_on_delivery_enabled: input.cashOnDelivery,
          free_shipping_threshold: input.freeShippingThreshold,
          pickup_address_ar: input.pickupAddressAr,
          pickup_address_en: input.pickupAddressEn,
          pickup_enabled: input.pickupEnabled,
          pickup_hours_ar: input.pickupHoursAr,
          pickup_hours_en: input.pickupHoursEn,
          shipping_fee: input.shippingFee,
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
      description: input.description,
      features_ar: input.featuresAr,
      features_en: input.featuresEn,
      name: input.name,
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
      governorate: optionalText(64).refine(
        (value) => value === null || GOVERNORATE_ID.test(value)
      ),
      id: optionalUuid,
      maxDays: int(0, 60),
      minDays: int(0, 60),
      nameAr: text(120),
      nameEn: text(120),
      position: int(0),
    })
    .refine((zone) => zone.maxDays >= zone.minDays, { path: ["maxDays"] }),
  async ({ input, supabase }) => {
    const row = {
      active: input.active,
      fee: input.fee,
      governorate: input.governorate,
      max_days: input.maxDays,
      min_days: input.minDays,
      name_ar: input.nameAr,
      name_en: input.nameEn,
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
