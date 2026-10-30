"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import type { Locale } from "@repo/internationalization";
import {
  formatNumber,
  formatRelativeTime,
} from "@repo/internationalization/format";
import { useRouter } from "@repo/internationalization/navigation";
import { BellIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { SectionSpinner } from "@/components/states";
import {
  describeNotification,
  type NotificationRow,
  notificationHref,
  useMarkNotificationsRead,
  useNotifications,
  useUnreadCount,
} from "@/lib/notifications";

/** More than this shows as "9+". */
const MAX_BADGE = 9;

const NotificationItem = ({
  notification,
  onOpen,
}: {
  readonly notification: NotificationRow;
  readonly onOpen: (notification: NotificationRow) => void;
}) => {
  const t = useTranslations("store.notifications");
  const locale = useLocale() as Locale;
  const text = describeNotification(notification, locale);
  const unread = !notification.read_at;

  return (
    <li>
      <button
        // Unread rows are marked by the dot; a tinted row would drop the
        // grey lines below AA contrast.
        className="grid w-full gap-0.5 px-4 py-3 text-start transition-colors hover:bg-accent"
        onClick={() => onOpen(notification)}
        type="button"
      >
        <span className="flex items-center gap-2 font-medium text-sm">
          {unread ? (
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-primary"
            />
          ) : null}
          {t(text.title, text.values)}
        </span>
        <span className="text-muted-foreground text-xs">
          {t(text.body, text.values)}
        </span>
        <span className="text-muted-foreground text-xs">
          {formatRelativeTime(notification.created_at, locale)}
        </span>
      </button>
    </li>
  );
};

/** The header bell: unread count, recent notifications, mark as read. */
export const NotificationBell = () => {
  const t = useTranslations("app.notifications");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  const notifications = useNotifications(open);
  const markRead = useMarkNotificationsRead();

  if (!user) {
    return null;
  }

  const count = unread.data ?? 0;
  const badge =
    count > MAX_BADGE
      ? t("many", { count: formatNumber(MAX_BADGE, locale) })
      : formatNumber(count, locale);

  const openNotification = (notification: NotificationRow) => {
    if (!notification.read_at) {
      markRead.mutate([notification.id]);
    }
    const href = notificationHref(notification.link, locale, undefined, {
      event: notification.event,
      kind: notification.kind,
    });
    setOpen(false);
    if (href?.startsWith("http")) {
      window.location.assign(href);
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-label={
            count
              ? t("labelUnread", { count: formatNumber(count, locale) })
              : t("label")
          }
          className="relative"
          size="icon"
          variant="ghost"
        >
          <BellIcon />
          {count ? (
            <span
              aria-hidden="true"
              className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-semibold text-[0.625rem] text-primary-foreground tabular-nums"
            >
              {badge}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <h2 className="font-medium text-sm">{t("title")}</h2>
          <Button
            disabled={!count || markRead.isPending}
            onClick={() => markRead.mutate(undefined)}
            size="sm"
            variant="ghost"
          >
            {t("markAllRead")}
          </Button>
        </div>
        {notifications.isPending ? <SectionSpinner className="py-8" /> : null}
        {notifications.isError ? (
          <p className="p-4 text-destructive text-sm" role="alert">
            {t("loadFailed")}
          </p>
        ) : null}
        {notifications.data?.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground text-sm">
            {t("empty")}
          </p>
        ) : null}
        {notifications.data?.length ? (
          <ul className="max-h-[min(24rem,60vh)] divide-y overflow-y-auto">
            {notifications.data.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onOpen={openNotification}
              />
            ))}
          </ul>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
