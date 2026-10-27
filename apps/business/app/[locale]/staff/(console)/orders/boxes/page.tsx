import { localized } from "@repo/commerce";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { PackForm, type PackSlot } from "./pack-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.orders.boxes");
  return { title: t("title") };
};

/** Orders whose boxes can be packed: paid, or confirmed for cash. */
const PACKABLE = ["confirmed", "paid", "processing"];

/** Copies offered per slot (cheapest first). */
const COPIES_SHOWN = 200;

type Supabase = Awaited<ReturnType<typeof requireSection>>["supabase"];

const loadLines = async (supabase: Supabase) => {
  const { data: boxes } = await supabase
    .from("boxes")
    .select(
      "product_id, box_parts (id, quantity, format, variant_id, category:product_categories (name_ar, name_en))"
    );
  const ids = (boxes ?? []).map((box) => box.product_id);
  const { data: lines } = await supabase
    .from("order_items")
    .select(
      "id, product_id, name_ar, name_en, quantity, box_theme:box_themes (name_ar, name_en), order:orders!inner (id, number, status, user_id)"
    )
    .in(
      "product_id",
      ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]
    )
    .eq("kind", "sale")
    .is("packed_at", null)
    .in("order.status", PACKABLE)
    .limit(50);
  return { boxes: boxes ?? [], lines: lines ?? [] };
};

/** The copies each slot of a box can take, labelled with name and price. */
const slotCopies = async (
  supabase: Supabase,
  slotIds: string[],
  locale: string,
  format: ReturnType<typeof formatters>
) => {
  const results = await Promise.all(
    slotIds.map(async (slot) => {
      const { data } = await supabase.rpc("box_slot_copies", { slot });
      return [slot, (data ?? []).slice(0, COPIES_SHOWN)] as const;
    })
  );
  const productIds = [
    ...new Set(
      results.flatMap(([, copies]) => copies.map((c) => c.product_id))
    ),
  ];
  const { data: products } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select("id, name_ar, name_en")
          .in("id", productIds)
      : { data: [] };
  const names = new Map(
    (products ?? []).map((product) => [
      product.id,
      localized(product, "name", locale),
    ])
  );
  return new Map(
    results.map(([slot, copies]) => [
      slot,
      copies.map((copy) => ({
        id: copy.stock_item,
        label: `${names.get(copy.product_id) ?? ""} · ${format.money(copy.price)}`,
      })),
    ])
  );
};

/**
 * Boxes to pack: paid (or cash-confirmed) box orders with the theme the
 * customer picked. Staff pick the copies for each slot, worth together at
 * least what the box promises; the fixed parts were taken with the order.
 */
const BoxesToPackPage = async () => {
  const { canWrite, supabase } = await requireSection("orders");
  const locale = await getLocale();
  const t = await getTranslations("admin.orders.boxes");
  const format = formatters(locale);

  const { boxes, lines } = await loadLines(supabase);
  const partsOf = new Map(boxes.map((box) => [box.product_id, box.box_parts]));
  const slots = [
    ...new Set(
      lines.flatMap((line) =>
        (partsOf.get(line.product_id ?? "") ?? [])
          .filter((part) => part.variant_id === null)
          .map((part) => part.id)
      )
    ),
  ];
  const [copies, customers] = await Promise.all([
    slotCopies(supabase, slots, locale, format),
    profileNames(
      supabase,
      lines.flatMap((line) => (line.order.user_id ? [line.order.user_id] : []))
    ),
  ]);

  return (
    <>
      <PageHeader
        back={{ href: "/orders", label: t("back") }}
        description={t("description")}
        title={t("title")}
      />
      <PageBody>
        {lines.length === 0 ? <EmptyState title={t("empty")} /> : null}
        {lines.map((line) => {
          const packSlots: PackSlot[] = (
            partsOf.get(line.product_id ?? "") ?? []
          )
            .filter((part) => part.variant_id === null)
            .map((part) => {
              const category = part.category
                ? localized(part.category, "name", locale)
                : "";
              return {
                copies: copies.get(part.id) ?? [],
                id: part.id,
                name: part.format ? `${part.format} · ${category}` : category,
                wanted: part.quantity * line.quantity,
              };
            });
          return (
            <Panel
              description={t("line", {
                customer: line.order.user_id
                  ? (customers.get(line.order.user_id) ?? "")
                  : "",
                quantity: format.number(line.quantity),
                theme: line.box_theme
                  ? localized(line.box_theme, "name", locale)
                  : t("noTheme"),
              })}
              key={line.id}
              title={
                <Link
                  className="hover:underline"
                  href={`/orders/${line.order.id}`}
                >
                  {t("order", {
                    name: localized(line, "name", locale),
                    number: String(line.order.number),
                  })}
                </Link>
              }
            >
              {canWrite ? <PackForm id={line.id} slots={packSlots} /> : null}
            </Panel>
          );
        })}
      </PageBody>
    </>
  );
};

export default BoxesToPackPage;
