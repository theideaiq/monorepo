import { categoryOptions } from "@repo/commerce";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody } from "@/components/admin/page";
import { RecordHeader } from "@/components/admin/record-header";
import { env } from "@/env";
import { tierOptions } from "@/lib/admin/catalog";
import { requireSection } from "@/lib/admin/session";
import { ProductForm } from "../../_components/product-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.products");
  return { title: t("new") };
};

const NewProductPage = async () => {
  const { supabase } = await requireSection("catalog", "write");
  const locale = await getLocale();
  const t = await getTranslations("admin.catalog");
  const [{ data: categories }, { data: plans }] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, name_ar, name_en, parent_id")
      .order("position"),
    supabase
      .from("plans")
      .select("name, audience, tier")
      .eq("audience", "plus")
      .is("student_of", null)
      .order("position"),
  ]);

  return (
    <>
      <RecordHeader
        breadcrumb={[{ href: "/catalog", label: t("title") }]}
        description={t("products.newHint")}
        title={t("products.new")}
      />
      <PageBody className="max-w-5xl">
        <ProductForm
          categories={categoryOptions(categories ?? [], locale)}
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
          tiers={tierOptions(plans ?? [])}
        />
      </PageBody>
    </>
  );
};

export default NewProductPage;
