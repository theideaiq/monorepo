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

Since this is a webhook-based bot, you will need to expose your local server to the internet and register the webhook URL with Telegram.

### 🔗 Webhook Setup

1.  **Expose Localhost**: Use a tool like [ngrok](https://ngrok.com/) to tunnel your local port to the internet.
    ```bash
    ngrok http 3000
    ```

2.  **Register Webhook**: Run the following command to tell Telegram where to send messages. Replace `<YOUR_BOT_TOKEN>` and `<YOUR_PUBLIC_URL>` (e.g., `https://abcd.ngrok-free.app`).

    ```bash
    curl -F "url=<YOUR_PUBLIC_URL>/api/webhook" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
    ```

3.  **Verify**: Check if the webhook was set successfully.
    ```bash
    curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
    ```

### Build

```bash
pnpm build
```

Builds the application for production.
