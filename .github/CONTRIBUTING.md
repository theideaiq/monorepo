# Contributing to The IDEA IQ

Thank you for your interest in contributing to **The IDEA IQ**! This document provides guidelines to ensure a smooth contribution process.

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand, React Query
- **Backend**: Supabase (Auth, DB, Storage, Edge Functions)
- **Monorepo**: Turborepo, pnpm
- **Tooling**: Biome (Linting/Formatting), Changesets (Versioning)

## 🚀 Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up Environment Variables:**
    - Copy `.env.example` to `.env.local` in `apps/web` and `apps/admin`.
    - Fill in the required Supabase credentials.

4.  **Run Development Server:**
    ```bash
    pnpm dev
    ```

## 📝 Coding Standards

### Linting & Formatting
We use **Biome** for linting and formatting. Ensure your code is compliant before committing.
```bash
pnpm check
```

### Commit Messages
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
- `feat: add new dashboard widget`
- `fix: resolve login redirect loop`
- `chore: update dependencies`
- `docs: update README`

### Semantic HTML
- Use proper semantic tags (`<main>`, `<section>`, `<article>`, `<nav>`).
- Ensure accessibility standards are met.

## 🧪 Testing

- **Unit Tests**: Vitest
- **E2E Tests**: Playwright

Run tests before submitting a PR:
```bash
pnpm test
```

## 📦 Versioning

We use **Changesets** for versioning. If your PR changes published packages, run:
```bash
pnpm changeset
```
Follow the prompts to describe your changes.

## 🤝 Pull Request Process

1.  Fork the repository and create a new branch.
2.  Make your changes and ensure tests pass.
3.  Open a Pull Request against the `main` branch.
4.  Wait for code review and address any feedback.

## 🔒 Security

If you discover a security vulnerability, please do NOT open an issue. Contact the security team directly at security@theideaiq.com.
