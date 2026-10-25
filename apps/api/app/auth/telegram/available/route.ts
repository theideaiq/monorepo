import { NextResponse } from "next/server";
import { webCorsHeaders, webPreflight } from "@/lib/cors";
import { telegramClient } from "@/lib/telegram-login/config";

export const OPTIONS = webPreflight;

/** Whether Telegram sign-in is set up (the website shows its button then). */
export const GET = (request: Request) =>
  NextResponse.json(
    { available: telegramClient() !== null },
    {
      headers: {
        ...webCorsHeaders(request, "GET, OPTIONS"),
        "Cache-Control": "public, max-age=300",
      },
    }
  );
