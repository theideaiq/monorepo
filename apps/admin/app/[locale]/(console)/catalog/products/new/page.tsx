import { localized } from "@repo/commerce";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/page";
import { env } from "@/env";
import { requireSection } from "@/lib/session";
import { ProductForm } from "../../_components/product-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.products");
  return { title: t("new") };
};

const NewProductPage = async () => {
  const { supabase } = await requireSection("catalog", "write");
  const locale = await getLocale();
  const t = await getTranslations("admin.catalog");
  const { data: categories } = await supabase
    .from("product_categories")
    .select("id, name_ar, name_en")
    .order("position");

  return (
    <>
      <PageHeader
        back={{ href: "/catalog", label: t("title") }}
        title={t("products.new")}
      />
      <PageBody className="max-w-5xl">
        <ProductForm
          categories={(categories ?? []).map((category) => ({
            id: category.id,
            label: localized(category, "name", locale),
          }))}
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        />
      </PageBody>
    </>
  );
};

export default NewProductPage;
