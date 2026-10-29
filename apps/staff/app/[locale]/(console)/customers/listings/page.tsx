import { getMemberListingPhotoUrls } from "@repo/storage";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { TakeDownForm } from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.customers.listings");
  return { title: t("title") };
};

/**
 * People's listings: what people sell each other, paid in cash to the
 * seller. Support read the live and reserved ones and take down any that
 * break the selling policy.
 */
const ListingsPage = async () => {
  const { canWrite, supabase } = await requireSection("customers");
  const locale = await getLocale();
  const t = await getTranslations("admin.customers.listings");
  const conditions = await getTranslations("store.condition");
  const format = formatters(locale);

  const { data } = await supabase
    .from("member_listings")
    .select(
      "id, number, user_id, title, condition, description, photos, governorate, price, status, created_at"
    )
    .in("status", ["active", "reserved"])
    .order("created_at", { ascending: false })
    .limit(100);
  const listings = data ?? [];
  const [names, photos] = await Promise.all([
    profileNames(
      supabase,
      listings.map((listing) => listing.user_id)
    ),
    Promise.all(
      listings.map((listing) =>
        getMemberListingPhotoUrls(supabase, listing.photos).catch(() => [])
      )
    ),
  ]);

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <PageBody>
        {listings.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <ul className="grid gap-3">
            {listings.map((listing, index) => (
              <li className="grid gap-3 rounded-lg border p-4" key={listing.id}>
                <div className="grid gap-1 text-sm">
                  <p className="font-medium">
                    {listing.title} · #{listing.number}
                  </p>
                  <p className="text-muted-foreground">
                    {conditions(listing.condition)} ·{" "}
                    {format.money(listing.price)} · {listing.governorate} ·{" "}
                    {names.get(listing.user_id) ?? t("unnamed")} ·{" "}
                    {t(`status.${listing.status as "active" | "reserved"}`)} ·{" "}
                    {format.dateTime(listing.created_at)}
                  </p>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {(photos[index] ?? []).map((url, photo) =>
                    url ? (
                      <li key={listing.photos[photo]}>
                        <a href={url} rel="noreferrer" target="_blank">
                          {/* biome-ignore lint/performance/noImgElement: a short-lived signed link */}
                          <img
                            alt={t("photo", {
                              number: format.number(photo + 1),
                            })}
                            className="size-24 rounded object-cover"
                            height={96}
                            src={url}
                            width={96}
                          />
                        </a>
                      </li>
                    ) : null
                  )}
                </ul>
                <p className="whitespace-pre-line text-sm">
                  {listing.description}
                </p>
                {canWrite ? <TakeDownForm id={listing.id} /> : null}
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
};

export default ListingsPage;
