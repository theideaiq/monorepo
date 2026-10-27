import { describe, expect, it, vi } from "vitest";
import { BOT_TEXTS, botStatus, setUpBot } from "./telegram-setup";

const targets = {
  apiUrl: "https://api.theideaiq.com",
  secret: "s".repeat(32),
  webUrl: "https://theideaiq.com",
};

describe("Droid's setup", () => {
  it("points the webhook here, then commands, the Mini App and texts", async () => {
    const call = vi.fn().mockResolvedValue(true);
    const result = await setUpBot(call, targets);
    expect(result.webhook).toBe("https://api.theideaiq.com/telegram/webhook");
    expect(call.mock.calls[0]?.[0]).toBe("setWebhook");
    expect(call.mock.calls[0]?.[1]).toMatchObject({
      secret_token: targets.secret,
      url: "https://api.theideaiq.com/telegram/webhook",
    });
    const methods = call.mock.calls.map(([method]) => method);
    expect(methods).toContain("setMyCommands");
    expect(methods).toContain("setChatMenuButton");
    expect(
      call.mock.calls.find(([method]) => method === "setChatMenuButton")?.[1]
    ).toMatchObject({
      menu_button: { web_app: { url: "https://theideaiq.com/tg" } },
    });
    expect(result.done).toEqual(["webhook", "commands", "menu", "texts"]);
  });

  it("keeps the texts within Telegram's limits", () => {
    for (const texts of Object.values(BOT_TEXTS)) {
      expect(texts.description.length).toBeLessThanOrEqual(512);
      expect(texts.short.length).toBeLessThanOrEqual(120);
    }
  });

  it("reads the status against where the webhook should point", async () => {
    const answers: Record<string, unknown> = {
      getChatMenuButton: {
        type: "web_app",
        web_app: { url: "https://theideaiq.com/tg" },
      },
      getMe: { username: "TheIDEADroidBot" },
      getMyCommands: [{ command: "start" }, { command: "help" }],
      getMyDescription: { description: "…" },
      getWebhookInfo: {
        last_error_date: 1_793_000_000,
        last_error_message: "Wrong response from the webhook: 401",
        pending_update_count: 3,
        url: "https://old.example/telegram/webhook",
      },
    };
    const status = await botStatus(
      (method: string) => Promise.resolve(answers[method]) as never,
      targets
    );
    expect(status).toMatchObject({
      commands: 2,
      description: true,
      menu: "https://theideaiq.com/tg",
      pending: 3,
      username: "TheIDEADroidBot",
      webhook: { matches: false, url: "https://old.example/telegram/webhook" },
    });
    expect(status.lastError?.message).toContain("401");
  });
});
