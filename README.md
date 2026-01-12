# The IDEA IQ Monorepo

![CI Status](https://github.com/theideaiq/monorepo/actions/workflows/ci.yml/badge.svg)
![Deployment Status](https://img.shields.io/netlify/status/theideaiq-web)
![License](https://img.shields.io/badge/License-Proprietary-red.svg)
![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)

This is the central routing hub and monorepo for The IDEA IQ ecosystem. It houses the main web application, shared packages, and configuration.

## 🏗 Architecture

The architecture consists of a Next.js web application communicating with Supabase for backend services (Auth, Database) and Wayl for payments/state, along with external integrations.

```mermaid
graph TD
    Client[Web App (Next.js 16)]
    Sub[Supabase (Auth & DB)]
    Wayl[Wayl (State & Payments)]
    Ext[External Services]

    Client -->|Auth/Data| Sub
    Client -->|Payments| Wayl
    Client -->|API| Ext
    Sub -->|Webhooks| Client
```

## 📦 Project Structure

The project is structured as a Monorepo using [Turbo](https://turbo.build/) and [pnpm](https://pnpm.io/).

- `apps/`
  - [`web`](./apps/web/README.md): The main consumer-facing Next.js application.
- `packages/`
  - `ui`: Shared UI components (Tailwind CSS).
  - `config`: Shared configuration (Biome, TypeScript).
  - `utils`: Shared utility functions.

## 🚀 Getting Started

### Prerequisites

- Node.js (v24.12.0+ recommended)
- pnpm (v9+)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    ```

3.  **Environment Setup**:
    Copy the example environment file to `.env.local` (or `.env` as needed) in `apps/web`.

    ```bash
    cp apps/web/.env.example apps/web/.env.local
    ```

    Ensure you populate the following variables:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=...
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    ```

4.  **Run Development Server**:
    ```bash
    pnpm dev
    ```

## 🛠 Tooling

- **Build System**: TurboRepo
- **Package Manager**: pnpm
- **Linting/Formatting**: Biome
- **Testing**: Vitest, Playwright

## 📄 License

All Rights Reserved. Copyright © The IDEA.
