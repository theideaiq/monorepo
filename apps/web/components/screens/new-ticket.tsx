"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatDate } from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { toSupportError } from "@/lib/errors";
import { useOrders } from "@/lib/store-queries";
import {
  isTicketTopic,
  MAX_MESSAGE_LENGTH,
  MAX_SUBJECT_LENGTH,
  TICKET_TOPICS,
  type TicketTopic,
  useCreateTicket,
} from "@/lib/support-queries";
import { ticketHref } from "./support";

const NO_ORDER = "none";

/**
 * /support/new — also opened from an order ("Get help with this order":
 * ?topic=order&order=<id>).
 */
export const NewTicket = () => {
  const t = useTranslations("app.support.new");
  const tSupport = useTranslations("app.support");
  const tTopic = useTranslations("store.ticketTopic");
  const tCommon = useTranslations("app.common");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const topicParam = params.get("topic");
  const create = useCreateTicket();
  const orders = useOrders();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState<TicketTopic>(
    isTicketTopic(topicParam) ? topicParam : "other"
  );
  const [orderId, setOrderId] = useState(params.get("order") ?? NO_ORDER);
  const [errors, setErrors] = useState<{ body?: boolean; subject?: boolean }>(
    {}
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const missing = { body: !body.trim(), subject: !subject.trim() };
    setErrors(missing);
    if (missing.body || missing.subject) {
      return;
    }
    create.mutate(
      {
        body,
        orderId: orderId === NO_ORDER ? null : orderId,
        subject,
        topic,
      },
      {
        onSuccess: (ticket) =>
          router.replace(ticket ? ticketHref(ticket.id) : "/help"),
      }
    );
  };

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-2xl flex-1 flex-col gap-6">
        <Link
          className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
          href="/help"
        >
          <ArrowLeftIcon className="size-4 rtl:rotate-180" />
          {t("back")}
        </Link>
        <p className="text-muted-foreground">{t("description")}</p>
        <form className="grid gap-5" noValidate onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="ticket-subject">{t("subject")}</Label>
            <Input
              aria-invalid={errors.subject || undefined}
              id="ticket-subject"
              maxLength={MAX_SUBJECT_LENGTH}
              onChange={(event) => setSubject(event.target.value)}
              value={subject}
            />
            {errors.subject ? (
              <p className="text-destructive text-sm">{t("subjectRequired")}</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label id="ticket-topic">{t("topic")}</Label>
              <Select
                onValueChange={(value) => setTopic(value as TicketTopic)}
                value={topic}
              >
                <SelectTrigger aria-labelledby="ticket-topic">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_TOPICS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {tTopic(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label id="ticket-order">{t("order")}</Label>
              <Select onValueChange={setOrderId} value={orderId}>
                <SelectTrigger aria-labelledby="ticket-order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ORDER}>{t("noOrder")}</SelectItem>
                  {orders.data?.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {tCommon("orderNumber", { number: String(order.number) })}{" "}
                      · {formatDate(order.created_at, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ticket-body">{t("message")}</Label>
            <Textarea
              aria-invalid={errors.body || undefined}
              id="ticket-body"
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("messagePlaceholder")}
              rows={6}
              value={body}
            />
            {errors.body ? (
              <p className="text-destructive text-sm">{t("messageRequired")}</p>
            ) : null}
          </div>
          <Button
            className="justify-self-start"
            disabled={create.isPending}
            type="submit"
          >
            {create.isPending ? t("sending") : t("submit")}
          </Button>
          {create.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {tSupport(`errors.${toSupportError(create.error)}`)}
            </p>
          ) : null}
        </form>
      </div>
    </>
  );
};
