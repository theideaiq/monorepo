import { formatPhone } from "@repo/auth/phone";
import { getTradeInPhotoUrls } from "@repo/storage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  DetailList,
  MaybeLink,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { profileNames } from "@/lib/admin/profiles";
import { canRead } from "@/lib/admin/roles";
import { requireSection } from "@/lib/admin/session";
import { staffMoves, tradeInStatusTone } from "@/lib/admin/trade-ins";
import { TradeInForms } from "./trade-in-forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.tradeIns");
  return { title: t("detail") };
};

/** One request: the item, its photos, the customer and the next steps. */
const TradeInPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { canWrite, staff, supabase } = await requireSection("tradeIns");
  const t = await getTranslations("admin.tradeIns");
  const tTrade = await getTranslations("store.tradeIn");
  const format = formatters(await getLocale());

  const { data: request } = await supabase
    .from("trade_ins")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!request) {
    notFound();
  }

  const [names, photoUrls] = await Promise.all([
    profileNames(supabase, [request.user_id, request.reviewed_by]),
    getTradeInPhotoUrls(supabase, request.photos, 60 * 30).catch(() =>
      request.photos.map(() => null)
    ),
  ]);
  const customerName = names.get(request.user_id) || t("unnamedCustomer");
  const moves = staffMoves(request.status);

  return (
    <>
      <PageHeader
        back={{ href: "/trade-ins", label: t("title") }}
        description={t("receivedOn", {
          date: format.dateTime(request.created_at),
        })}
        title={`${t("number", { number: String(request.number) })} · ${request.title}`}
      >
        <StatusBadge tone={tradeInStatusTone[request.status]}>
          {tTrade(`status.${request.status}`)}
        </StatusBadge>
      </PageHeader>
      <PageBody className="lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          <Panel title={t("item")}>
            <DetailList
              items={[
                {
                  label: t("category"),
                  value: tTrade(`category.${request.category}`),
                },
                {
                  label: t("condition"),
                  value: tTrade(`condition.${request.condition}`),
                },
                {
                  label: t("payout"),
                  value: tTrade(`payout.${request.payout}`),
                },
                {
                  label: t("asking"),
                  value:
                    request.asking_price === null
                      ? t("noAskingPrice")
                      : format.money(request.asking_price),
                },
              ]}
            />
            {request.description ? (
              <p className="whitespace-pre-wrap break-words text-sm">
                {request.description}
              </p>
            ) : null}
          </Panel>
          <Panel title={t("photos")}>
            {request.photos.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("noPhotos")}</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photoUrls.map((url, index) => (
                  <li key={request.photos[index]}>
                    {url ? (
                      <a href={url} rel="noopener noreferrer" target="_blank">
                        {/* biome-ignore lint/performance/noImgElement: signed, short-lived URL */}
                        <img
                          alt={t("photoAlt", {
                            number: format.number(index + 1),
                          })}
                          className="aspect-square w-full rounded-md border object-cover"
                          height={240}
                          src={url}
                          width={240}
                        />
                      </a>
                    ) : (
                      <span className="flex aspect-square items-center justify-center rounded-md border border-dashed text-muted-foreground text-xs">
                        {t("photoMissing")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel title={t("details")}>
            <DetailList
              items={[
                {
                  label: t("customer"),
                  value: (
                    <MaybeLink
                      href={
                        canRead(staff.role, "customers")
                          ? `/customers/${request.user_id}`
                          : null
                      }
                    >
                      {customerName}
                    </MaybeLink>
                  ),
                },
                {
                  label: t("phone"),
                  value: (
                    <a
                      className="hover:underline"
                      dir="ltr"
                      href={`tel:${request.contact_phone}`}
                    >
                      {formatPhone(request.contact_phone)}
                    </a>
                  ),
                },
                {
                  label: t("offer"),
                  value:
                    request.offer_amount === null
                      ? t("noOffer")
                      : format.money(request.offer_amount),
                },
                ...(request.offered_at
                  ? [
                      {
                        label: t("offeredAt"),
                        value: format.dateTime(request.offered_at),
                      },
                    ]
                  : []),
                ...(request.reviewed_by
                  ? [
                      {
                        label: t("reviewedBy"),
                        value:
                          names.get(request.reviewed_by) || t("unnamedStaff"),
                      },
                    ]
                  : []),
                ...(request.product_id
                  ? [
                      {
                        label: t("product"),
                        value: (
                          <MaybeLink
                            href={
                              canRead(staff.role, "catalog")
                                ? `/catalog/products/${request.product_id}`
                                : null
                            }
                          >
                            {t("draftProduct")}
                          </MaybeLink>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
            {request.offer_note ? (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="mb-1 font-medium text-xs">
                  {t("noteToCustomer")}
                </p>
                <p className="whitespace-pre-wrap">{request.offer_note}</p>
              </div>
            ) : null}
          </Panel>
          {canWrite ? (
            <TradeInForms
              moves={moves}
              offerAmount={request.offer_amount}
              offerNote={request.offer_note}
              tradeInId={request.id}
            />
          ) : null}
        </div>
      </PageBody>
    </>
  );
};

export default TradeInPage;
