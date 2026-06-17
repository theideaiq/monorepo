# Droid (Telegram Bot)

The intelligent Telegram bot for The IDEA IQ, powered by Google Gemini.

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router / API Routes)
- **Bot Framework**: [grammY](https://grammy.dev/)
- **AI**: Google Generative AI (Gemini 2.5)
- **Database**: Supabase
- **Cache**: Upstash Redis (Session Storage)

## 🧠 AI Capabilities

Droid is configured with a specific persona and business knowledge:
- **Product Search**: Can query the `products` table in real-time.
- **Context Awareness**: Remembers up to 20 messages in the conversation history.
- **Spam Protection**: Automatically deletes crypto/spam messages in groups.

## 🚀 Getting Started

### Prerequisites

Ensure you have the environment variables set up in `.env.local` (copy from `.env.example`).
You will need a Telegram Bot Token and Google AI API Key.

### Development

```bash
pnpm dev
```

### Webhook Setup

Since this is a webhook-based bot, you must expose your local server to the internet and register the URL with Telegram.

1.  **Expose Localhost:**
    Use `ngrok` (or similar) to tunnel traffic to your local port (default Next.js port is 3000, but check your output).
    ```bash
    ngrok http 3000
    ```
    *Copy the HTTPS URL provided by ngrok (e.g., `https://1234-56-78.ngrok-free.app`).*

2.  **Register Webhook:**
    Run the following command to tell Telegram where to send messages. Replace `<YOUR_BOT_TOKEN>` and `<YOUR_NGROK_URL>`:

    ```bash
    curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
         -d "url=<YOUR_NGROK_URL>/api/webhook" \
         -d "drop_pending_updates=true"
    ```
    *Note: `drop_pending_updates=true` prevents the bot from processing old messages upon restart.*

### Troubleshooting

-   **404 Not Found**: Ensure your webhook URL ends with `/api/webhook`.
-   **SSL Error**: Telegram requires HTTPS. Ensure your ngrok tunnel is using `https`.
-   **No Response**: Check the server logs. If `pnpm dev` isn't running, the webhook will fail.

### Build

```bash
pnpm build
```

Builds the application for production.
