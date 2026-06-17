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

1.  **Start the local server:**
    ```bash
    pnpm dev
    ```

2.  **Expose your local server (Tunneling):**
    Use a tool like `ngrok` to expose port 3000 (check your terminal output for the exact port).
    ```bash
    ngrok http 3000
    ```
    Copy the HTTPS URL provided by ngrok (e.g., `https://<random-id>.ngrok-free.app`).

3.  **Register the Webhook:**
    Tell Telegram to send updates to your tunneled URL. Replace `<YOUR_BOT_TOKEN>` and `<YOUR_NGROK_URL>` below.
    ```bash
    curl -F "url=<YOUR_NGROK_URL>/api/webhook" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
    ```

### Build

```bash
pnpm build
```

Builds the application for production.
