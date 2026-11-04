import type { ReactElement } from "react";
import { prerender } from "react-dom/static";
import { describe, expect, test, vi } from "vitest";
import {
  deadlineReminderProps,
  EMAIL_EVENTS,
  sendReminderEmails,
} from "../lib/reminder-emails";

const url = (link: string | null, locale: "ar" | "en") =>
  `https://theideaiq.com${locale === "ar" ? "/ar" : ""}${link ?? "/pass"}`;

const opportunity = {
  data: {
    deadline: "2027-01-12T20:59:00+00:00",
    title_ar: "منحة تشيفنينغ",
    title_en: "Chevening Scholarship",
  },
  email: "sara@example.iq",
  event: "opportunity_deadline",
  link: "/club/opportunities/chevening",
  locale: "en",
};

const travel = {
  data: {
    count: 3,
    country: "DE",
    due_on: "2027-01-10",
    title_ar: "حجز موعد الفيزا",
    title_en: "Book the visa appointment",
  },
  email: "omar@example.iq",
  event: "travel_due",
  link: "/pass/travel/k1",
  locale: "ar",
};

const fakeAdmin = (
  rows: unknown[],
  error: { message: string } | null = null
) => {
  const rpc = vi.fn(() => Promise.resolve({ data: rows, error }));
  return {
    admin: { rpc } as unknown as Parameters<
      typeof sendReminderEmails
    >[0]["admin"],
    rpc,
  };
};

describe("deadline reminder content", () => {
  test("an opportunity: its title, deadline in Baghdad time and page", () => {
    expect(deadlineReminderProps(opportunity, url)).toEqual({
      date: "12 January 2027",
      href: "https://theideaiq.com/club/opportunities/chevening",
      kind: "opportunity",
      locale: "en",
      title: "Chevening Scholarship",
    });
    // 20:59 UTC is the next day in Baghdad.
    expect(
      deadlineReminderProps(
        {
          ...opportunity,
          data: { ...opportunity.data, deadline: "2027-01-12T21:30:00Z" },
        },
        url
      )?.date
    ).toBe("13 January 2027");
  });

  test("a Travel Kit: the first line, how many more, the country, Latin digits", () => {
    const props = deadlineReminderProps(travel, url);
    expect(props).toMatchObject({
      href: "https://theideaiq.com/ar/pass/travel/k1",
      kind: "travel",
      locale: "ar",
      more: "2",
      title: "حجز موعد الفيزا",
    });
    expect(props?.date).toContain("2027");
    expect(props?.date).toContain("10");
    expect(props?.country).toBe("ألمانيا");
    expect(
      deadlineReminderProps(
        { ...travel, data: { ...travel.data, count: 1 }, locale: "en" },
        url
      )
    ).toMatchObject({
      country: "Germany",
      date: "10 January 2027",
      more: undefined,
      title: "Book the visa appointment",
    });
  });

  test("skips other events and incomplete data", () => {
    expect(
      deadlineReminderProps({ ...opportunity, event: "order_paid" }, url)
    ).toBeNull();
    expect(
      deadlineReminderProps({ ...travel, data: { count: 2 } }, url)
    ).toBeNull();
  });

  test("falls back to the other language's title", () => {
    expect(
      deadlineReminderProps(
        { ...opportunity, data: { ...opportunity.data, title_en: "" } },
        url
      )?.title
    ).toBe("منحة تشيفنينغ");
  });
});

describe("sending reminder emails", () => {
  test("claims both events and emails each row once", async () => {
    const { admin, rpc } = fakeAdmin([
      opportunity,
      travel,
      { ...travel, email: null },
      { ...opportunity, data: {} },
    ]);
    const send = vi.fn(
      (_email: { react: unknown; subject: string; to: string }) =>
        Promise.resolve()
    );
    const summary = await sendReminderEmails({
      admin,
      logger: { error: vi.fn() },
      send,
      url,
    });
    expect(rpc).toHaveBeenCalledWith("claim_email_notifications", {
      events: [...EMAIL_EVENTS],
    });
    expect(EMAIL_EVENTS).toEqual(["opportunity_deadline", "travel_due"]);
    expect(summary).toEqual({ failed: 0, sent: 2, skipped: 2 });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Closing soon: Chevening Scholarship",
        to: "sara@example.iq",
      })
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "قرّب موعد بملف سفرك",
        to: "omar@example.iq",
      })
    );

    const travelEmail = send.mock.calls.find(
      ([email]) => email.to === "omar@example.iq"
    )?.[0];
    const { prelude } = await prerender(travelEmail?.react as ReactElement);
    const html = await new Response(prelude).text();
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("حجز موعد الفيزا");
    expect(html).toContain("و2 شغلات ثانية");
    expect(html).toContain("https://theideaiq.com/ar/pass/travel/k1");
  });

  test("one failed email never stops the others", async () => {
    const { admin } = fakeAdmin([opportunity, travel]);
    const logger = { error: vi.fn() };
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("Resend is down"))
      .mockResolvedValueOnce(undefined);
    expect(await sendReminderEmails({ admin, logger, send, url })).toEqual({
      failed: 1,
      sent: 1,
      skipped: 0,
    });
    expect(logger.error).toHaveBeenCalledWith(
      "Reminder email failed: Resend is down"
    );
  });

  test("throws when the claim fails", async () => {
    const { admin } = fakeAdmin([], { message: "boom" });
    await expect(
      sendReminderEmails({
        admin,
        logger: { error: vi.fn() },
        send: vi.fn(),
        url,
      })
    ).rejects.toThrow("boom");
  });
});
