# Droid (Telegram Bot)

The intelligent Telegram bot for The IDEA IQ, powered by Google Gemini.

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router / API Routes)
- **Bot Framework**: [grammY](https://grammy.dev/)
- **AI**: Google Generative AI (Gemini)
- **Database**: Supabase
- **Cache**: Upstash Redis

## 🚀 Getting Started

### Prerequisites

Ensure you have the environment variables set up in `.env.local` (copy from `.env.example`).
You will need a Telegram Bot Token and Google AI API Key.

### Development

```bash
pnpm dev
```

Since this is a webhook-based bot, you will need to expose your local server to the internet (e.g., using `ngrok`) and set the webhook URL with Telegram.

### Build

```bash
pnpm build
```

Builds the application for production.
