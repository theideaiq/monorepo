# Admin Console

The internal administration dashboard for The IDEA IQ.

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4, Framer Motion
- **Components**: shadcn/ui (via @repo/ui), Lucide React
- **Data**: TanStack Table, Recharts
- **Emails**: Resend, React Email

## 🚀 Getting Started

### Prerequisites

Ensure you have the environment variables set up in `.env.local` (copy from `.env.example`).

### Development

```bash
pnpm dev
```

Runs the app in development mode at [http://localhost:3001](http://localhost:3001).

### Build

```bash
pnpm build
```

Builds the application for production.

### Database Seeding

To seed the database with initial product data:

```bash
pnpm seed
```

## 🧪 Testing

### Unit Tests (Vitest)

```bash
pnpm test
```
