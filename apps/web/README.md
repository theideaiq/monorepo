# Web App

The public-facing web application for The IDEA IQ.

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4, Framer Motion
- **State**: Zustand, React Query
- **Mobile**: Capacitor (Android/iOS)
- **I18n**: next-intl
- **Testing**: Vitest, Playwright

## 🚀 Getting Started

### Prerequisites

Ensure you have the environment variables set up in `.env.local` (copy from `.env.example`).

### Development

```bash
pnpm dev
```

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build
```

Builds the application for production.

### Mobile Build

To build for mobile (Capacitor):

```bash
pnpm build:mobile
```

## 🧪 Testing

### Unit Tests (Vitest)

```bash
pnpm test
```

### E2E Tests (Playwright)

```bash
pnpm e2e
```
