# Contributing to The IDEA IQ

First off, thank you for considering contributing to **The IDEA IQ**. We value your time and effort in helping us build the future of our digital ecosystem.

This document serves as a comprehensive guide to our standards, workflows, and tools. Please read it carefully to ensure a smooth contribution process.

---

## 🛠 Tech Stack & Architecture

We operate a high-performance Monorepo powered by **TurboRepo**.

- **Package Manager**: [PNPM v10](https://pnpm.io/) (Strictly enforced)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 4
- **Database & Auth**: Supabase
- **Linting & Formatting**: [Biome](https://biomejs.dev/)
- **Versioning**: Changesets

### Structure Overview
- **`apps/`**: Deployable applications.
  - `web`: The public superapp (Marketing, Store, Academy). Includes Capacitor for mobile.
  - `admin`: Internal dashboard (Finance, CRM).
  - `droid`: AI Automation service & Telegram bot (Serverless Webhook).
- **`packages/`**: Shared internal libraries.
  - `ui`: "Dumb" design system components.
  - `env`: Environment variable validation schemas.
  - `database`: Shared DB types and clients.
  - `config`: Shared configurations (TSConfig, Biome, Tailwind).

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js**: v24.x (Check `.nvmrc`)
- **PNPM**: v10.x (`npm install -g pnpm`)

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone <your-repo-url>
cd <your-repo-name>
pnpm install
```

### 3. Environment Variables
We use `@repo/env` to validate environment variables strictly. You must set up your local secrets.
* Copy the example files in the apps you are working on:
  ```bash
  cp apps/web/.env.example apps/web/.env.local
  cp apps/admin/.env.example apps/admin/.env.local
  ```

* Fill in the required Supabase keys and API tokens.
  > Note: The app will fail to build if required keys are missing.

### 4. Running the Project
Start the development server for all apps simultaneously:
```bash
pnpm dev
```

To run a specific app (e.g., only the web app):
```bash
pnpm --filter web dev
```

## 📝 Development Standards

### Linting & Formatting (Biome)
We do not use Prettier or ESLint. We use **Biome**.
Before committing, ensure your code passes our quality checks:

```bash
# Run linting and formatting checks
pnpm check

# Fix simple formatting issues automatically
pnpm format
```

### Type Checking
TypeScript is strict. Ensure there are no errors across the monorepo:
```bash
pnpm typecheck
```

### Branching Strategy
* `main`: The source of truth. Production code.
* `feature/your-feature-name`: For new features.
* `fix/your-fix-name`: For bug fixes.
* `refactor/your-refactor-name`: For code cleanup.

## 📦 Versioning & Publishing (Changesets)
We use **Changesets** to manage versions for our internal packages (`packages/ui`, etc.).

**When to use Changesets:**
* You modified a shared package (e.g., added a Button to `@repo/ui`).
* You modified core logic in `@repo/database`.

**How to use:**
1. Run the changeset command:
   ```bash
   pnpm changeset
   ```

2. Select the package(s) you modified.
3. Select the bump type (`patch` for bug fixes, `minor` for features).
4. Write a summary of your changes.

> Note: You do not need to create changesets for updates to `apps/web`, `apps/admin`, or `apps/droid` as they are deployed, not published.

## 💾 Commit Convention
We adhere strictly to the **Conventional Commits** specification. This is enforced by `commitlint` hooks.

**Format**: `<type>(<scope>): <subject>`

**Allowed Types:**
* `feat`: A new feature
* `fix`: A bug fix
* `docs`: Documentation only changes
* `style`: Changes that do not affect the meaning of the code (white-space, formatting)
* `refactor`: A code change that neither fixes a bug nor adds a feature
* `perf`: A code change that improves performance
* `test`: Adding missing tests or correcting existing tests
* `chore`: Changes to the build process or auxiliary tools (e.g., Turbo, PNPM)

**Examples:**
* ✅ `feat(ui): add new dialog component`
* ✅ `fix(auth): resolve redirect loop on login`
* ✅ `chore(deps): upgrade supabase-js`
* ❌ `Added a button` (Will be rejected by hook)

## 🧪 Testing
We use **Vitest** for unit tests and **Playwright** for E2E tests.

```bash
# Run all unit tests
pnpm test

# Run E2E tests (requires running app)
pnpm turbo e2e
```

## 📱 Mobile Development (Capacitor)
The `apps/web` application is wrapped with Capacitor for Android/iOS.

To sync web changes to the native android project:
```bash
# Inside apps/web
npx cap sync android
```

> Important: Do not commit the `android/` or `ios/` build artifacts (APK/IPA files).

## 🤝 Pull Request Process
1. Create a new branch from `main`.
2. Make your changes.
3. Run `pnpm clean` and `pnpm build` locally to ensure no caching issues.
4. Open a Pull Request.
5. Ensure the CI / Quality Gate passes.
6. Wait for a review from the Code Owners.
