import { localized } from "@repo/commerce";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/action-button";
import { PageBody, PageHeader, Panel } from "@/components/page";
import { env } from "@/env";
import { isUuid } from "@/lib/list";
import { requireSection } from "@/lib/session";
import { deleteProduct } from "../../actions";
import { ProductForm } from "../../_components/product-form";
import { VariantForm } from "../../_components/variant-form";

interface ProductPageProps {
  readonly params: Promise<{ id: string }>;
}

const ProductPage = async ({ params }: ProductPageProps) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { canWrite, supabase } = await requireSection("catalog");
  const locale = await getLocale();
  const t = await getTranslations("admin.catalog");
  const tCommon = await getTranslations("admin.common");

  const [{ data: product }, { data: variants }, { data: categories }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", id)
        .order("position"),
      supabase
        .from("product_categories")
        .select("id, name_ar, name_en")
        .order("position"),
    ]);

  if (!product) {
    notFound();
  }

  return (
    <>
      <PageHeader
        back={{ href: "/catalog", label: t("title") }}
        description={product.slug}
        title={localized(product, "name", locale)}
      >
        {canWrite ? (
          <ActionButton
            action={deleteProduct}
            confirm={{
              description: t("products.deleteDescription"),
              title: tCommon("deleteConfirm"),
            }}
            fields={{ id: product.id }}
            variant="destructive"
          >
            {tCommon("delete")}
          </ActionButton>
        ) : null}
      </PageHeader>
      <PageBody className="max-w-5xl">
        <ProductForm
          categories={(categories ?? []).map((category) => ({
            id: category.id,
            label: localized(category, "name", locale),
          }))}
          disabled={!canWrite}
          product={product}
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        />
        <Panel description={t("variants.description")} title={t("variants.title")}>
          {(variants ?? []).map((variant) => (
            <VariantForm
              disabled={!canWrite}
              key={`${variant.id}-${variant.created_at}`}
              productId={product.id}
              variant={variant}
            />
          ))}
          {canWrite ? (
            // A new key after each added variant clears the form.
            <VariantForm
              key={`new-${variants?.length ?? 0}`}
              productId={product.id}
            />
          ) : null}
        </Panel>
      </PageBody>
    </>
  );
};

export default ProductPage;
