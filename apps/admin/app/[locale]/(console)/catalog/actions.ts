"use server";

import { Constants } from "@repo/database";
import { z } from "zod";
import { ActionFailure, affected, check, staffAction } from "@/lib/action";
import { success } from "@/lib/action-state";
import {
  checkbox,
  int,
  keyValues,
  lines,
  optionalInt,
  optionalText,
  optionalUuid,
  slug,
  storagePaths,
  text,
  uuid,
} from "@/lib/forms";

const { Enums } = Constants.public;

const productSchema = z
  .object({
    categoryId: optionalUuid,
    compareAtPrice: optionalInt(0),
    condition: z.enum(Enums.product_condition),
    descriptionAr: optionalText(10_000),
    descriptionEn: optionalText(10_000),
    detailKey: z.array(z.string()).optional(),
    detailValue: z.array(z.string()).optional(),
    featured: checkbox,
    id: optionalUuid,
    images: storagePaths(12),
    kind: z.enum(Enums.product_kind),
    nameAr: text(200),
    nameEn: text(200),
    price: int(0),
    slug,
    status: z.enum(Enums.product_status),
    stock: int(0, 1_000_000),
  })
  .refine(
    (product) =>
      product.compareAtPrice === null || product.compareAtPrice > product.price,
    { path: ["compareAtPrice"] }
  );

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
      images: input.images,
      kind: input.kind,
      name_ar: input.nameAr,
      name_en: input.nameEn,
      price: input.price,
      slug: input.slug,
      status: input.status,
      stock_count: input.stock,
    };

    if (input.id) {
      affected(
        await supabase
          .from("products")
          .update(row)
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
  attrKey: z.array(z.string()).optional(),
  attrValue: z.array(z.string()).optional(),
  id: optionalUuid,
  position: int(0, 10_000),
  priceOverride: optionalInt(0),
  productId: uuid,
  sku: optionalText(64),
  stock: int(0, 1_000_000),
});

export const saveVariant = staffAction(
  "catalog",
  variantSchema,
  async ({ input, supabase }) => {
    const attributes = keyValues(input.attrKey, input.attrValue);
    if (Object.keys(attributes).length === 0) {
      throw new ActionFailure("invalid");
    }
    const row = {
      attributes,
      position: input.position,
      price_override: input.priceOverride,
      product_id: input.productId,
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
    freeShippingThreshold: optionalInt(0),
    shippingFee: int(0),
  }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("store_settings")
        .update({
          free_shipping_threshold: input.freeShippingThreshold,
          shipping_fee: input.shippingFee,
        })
        .eq("id", true)
        .select("id")
    );
    return success();
  }
);

const planSchema = z
  .object({
    active: checkbox,
    amount: int(0),
    audience: z.enum(["business", "plus"]),
    billingInterval: z.enum(Enums.billing_interval),
    description: optionalText(500),
    featuresAr: lines(20, 200),
    featuresEn: lines(20, 200),
    id: slug.max(64),
    isNew: checkbox,
    name: text(120),
    position: int(0, 10_000),
    rentalSlots: optionalInt(1, 50),
  })
  .refine((plan) => plan.audience !== "plus" || plan.rentalSlots !== null, {
    path: ["rentalSlots"],
  });

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
      rental_slots: input.audience === "plus" ? input.rentalSlots : null,
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
