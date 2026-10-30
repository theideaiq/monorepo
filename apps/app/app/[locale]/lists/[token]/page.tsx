import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductCard } from "@/components/product-card";
import { getSharedList } from "@/lib/data";

interface SharedListProps {
  params: Promise<{ locale: Locale; token: string }>;
}

export const dynamic = "force-dynamic";

export const generateMetadata = async ({
  params,
}: SharedListProps): Promise<Metadata> => {
  const { locale, token } = await params;
  const list = await getSharedList(token);
  const t = await getTranslations({ locale, namespace: "web.sharedList" });
  return {
    // A shared list is for the friends it was sent to, not for search.
    robots: { follow: false, index: false },
    title: list
      ? t("title", { name: list.name, owner: list.owner })
      : t("missing"),
  };
};

/**
 * A member's list, shared by link: its name, their first name and its
 * products, for friends to see what they'd like.
 */
const SharedListPage = async ({ params }: SharedListProps) => {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const list = await getSharedList(token);
  if (!list) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.sharedList" });

  return (
    <div className="container grid gap-6 py-8">
      <header className="grid gap-2">
        <h1 className="font-semibold text-3xl">{list.name}</h1>
        <p className="text-muted-foreground">
          {list.owner ? t("from", { owner: list.owner }) : t("fromSomeone")}
        </p>
      </header>
      {list.products.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {list.products.map((product) => (
            <ProductCard key={product.id} locale={locale} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedListPage;
