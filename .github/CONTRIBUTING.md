# Contributing

We welcome contributions! Please follow these guidelines to ensure a smooth process.

## Getting Started

1.  **Fork and Clone**: Fork the repository and clone it locally.
2.  **Install Dependencies**:
    ```bash
    pnpm install
    ```
3.  **Environment Variables**:
    Create a `.env.local` file in the root directory and add the required environment variables:
    ```
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    NEXT_PUBLIC_ADMIN_EMAIL=your_admin_email
    ```
4.  **Run Development Server**:
    ```bash
    pnpm run dev
    ```

## Code Quality & Standards

- **Linting**: We use ESLint. Run `pnpm run lint` before committing to ensure your code follows the standards.
- **Translations**: We use `next-intl`. If you add text, please use `t()` and add keys to `messages/en.json` (and other languages if applicable).
- **Component Structure**: Place reusable components in `components/` and page-specific logic in `app/`.
- **Animations**: Use `framer-motion` for animations, preferably in client components.

## Development Workflow

1.  **Branching**: Create a new branch for your feature or fix.
    - `feature/your-feature-name`
    - `fix/your-fix-name`
2.  **Commits**: Use descriptive commit messages.
3.  **Pull Requests**:
    - Push your branch and open a PR against `main`.
    - Describe your changes clearly.
    - Ensure the build passes (`pnpm run build`).

## Testing

Currently, the project relies on manual verification and linting. Please verify your changes locally before submitting.

## Reporting Issues

If you find a bug, please open an issue with a detailed description and steps to reproduce.
