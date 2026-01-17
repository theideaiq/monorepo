# AGENTS.md

This file consolidates the "memory" and guidelines for AI agents working on this project. It serves as a single source of truth for architectural decisions, coding standards, security protocols, and operational learnings.

## Architect (Architecture & Code Structure)

### 2025-02-18 - Single Responsibility Modules

Smell: Generic "utils" or "helpers" files that become dumping grounds for unrelated functions.
Standard: Utilities should be grouped by domain (e.g., `date.ts`, `string.ts`) or, if singular and important, given their own file (e.g., `cn.ts`).

### 2025-02-18 - Icon Standard

Smell: Copy-pasting SVG code for common icons when a library like `lucide-react` is already in use.
Standard: Always use the imported icon component from the design system's icon library (e.g., `lucide-react`). Only use custom SVGs for branding or unique assets not available in the library.

## Bolt (Performance)

### 2024-05-23 - Regex Compilation in Loops
**Learning:** Instantiating `RegExp` objects inside hot loops (like `Array.prototype.filter`) can cause significant garbage collection pressure, even if the parsing overhead itself is small. Pre-compiling regexes as module-level constants is a simple, high-impact optimization for these scenarios.
**Action:** Always check loop bodies for regex literals or `new RegExp()` calls and hoist them to the module scope or a parent scope.

### 2025-02-27 - Supabase Field Selection
**Learning:** Using `.select('*')` in Supabase queries fetches all columns, including potentially large unused data (JSON blobs, descriptions), increasing payload size and memory usage.
**Action:** Always specify exact columns (e.g., `.select('id, name, status')`) when querying tables, especially in list views or high-traffic endpoints.

## Curator (File Organization)

### 2025-02-18 - Co-location of Internationalization Logic

Structure: Internationalization routing logic (`navigation.ts`) is now co-located with `request.ts` in `src/i18n/`.
Rule: Files that are tightly coupled by domain logic (like `next-intl` configuration and routing) should reside in the same directory, rather than being split between root `src/` and subdirectories.

### 2025-02-18 - Component Bundling in UI Package

Structure: UI Components (e.g., `Button`, `Modal`) are now grouped into their own directories (e.g., `src/button/`, `src/modal/`) containing the component, tests, and stories.
Rule: Do not leave flat component files in the root of `packages/ui/src/`. Create a folder for each component to co-locate related assets.

## Palette (UI/UX & Accessibility)

### 2026-01-13 - Skip to Content Link
**Learning:** For keyboard and screen reader users, repeated navigation menus on every page are a major barrier. A "Skip to Content" link is a simple, invisible-until-focused mechanism that drastically improves navigation efficiency.
**Action:** Ensure every page layout includes a hidden link at the very top that targets the main content area (`<main id="main-content">`).

### 2026-01-07 - Input Component Accessibility
**Learning:** Screen readers require explicit association between inputs and their error messages. Merely rendering the error text near the input is insufficient for non-visual users to know the input is invalid or what the error is.
**Action:** When creating form inputs, always generate a unique ID for the error message, add `aria-invalid` to the input when in an error state, and link them using `aria-describedby`.

### 2025-02-23 - Accessibility in Dynamic Modals
**Learning:** React 19 `useId` is critical for linking dynamic modal titles with `aria-labelledby` without prop drilling IDs. Focus management (trapping or initial focus) in `useEffect` is essential but requires `requestAnimationFrame` to ensure the DOM is ready in some cases, especially with Framer Motion animations.
**Action:** Always check if a modal focuses its content on open. If using animations, verify focus timing.

### 2025-05-21 - Empty States with Actions
**Learning:** A blank list (e.g., "No results") is a dead end for users. An empty state should explain *why* it's empty and provide a clear *action* to resolve it (e.g., "Clear Filters", "Create New").
**Action:** When rendering lists that can be empty, always include a dedicated empty state component with an icon, explanation, and a call-to-action button.

## Pixel (UI Implementation Details)

### 2024-02-14 - Inconsistent Style Merging
**Learning:** Found critical inconsistency in how UI components handle class merging. `Button` and `Input` use a robust `cn` utility (clsx + tailwind-merge) which allows safe class overrides, while `Select` and `Card` used hardcoded template literals, making them fragile and harder to extend.
**Action:** Always verify if a `cn` utility exists in the project before writing new components. If modifying existing ones, standardize on `cn` to prevent "specificity wars" and allow clean overrides (e.g. `className` props passed from parents should reliably override defaults).

### 2025-05-20 - Missing Brand Token for Deep Dark Backgrounds
**Learning:** Multiple components (`GlobalLoader`, `Footer`, `plus/page`, `megastore/page`) were hardcoding `#0f1014` as a background color. This color is slightly deeper than the configured `brand-dark` (`#0f172a`), creating a "magic number" dependency that makes theming inconsistent.
**Action:** Introduced `--color-brand-deep` (`#0f1014`) to the Tailwind theme config. Future dark-mode or "cinema-mode" backgrounds should use `bg-brand-deep` instead of hardcoded hex values or generic black.

### 2025-05-21 - Semantic Link Styling
**Learning:** Detected invalid HTML nesting (`<Link><button>`) in `Navbar`, causing accessibility and hydration issues. This often happens when developers want a link to "look like a button" but use composition incorrectly.
**Action:** Do not nest `<button>` inside `<Link>`. Instead, apply button utility classes directly to the `<Link>` component or use `asChild` if using a UI library component that supports polymorphism.

### 2025-05-23 - Standardizing Overlay Styles
**Learning:** `Sheet` and `Modal` components used different overlay styles (`bg-black/60 backdrop-blur-sm`) and consistent close button styling.
**Action:** Standardized on `bg-black/60 backdrop-blur-sm` for a more modern, consistent look across all overlay components. Also aligned close button interactions to use `hover:text-brand-pink`.

## Scribe (Documentation & Style Guide)

### 2024-05-23 - Initial Setup

Insight: Starting the Scribe journal to track documentation standards and critical learnings.
Rule: Documentation must be clear, accurate, and verified against the actual code behavior.

### 2024-05-23 - Environment Variable Parity

Insight: `YOUTUBE_API_KEY` was required in code but missing from `README.md`, causing potential setup friction.
Rule: Every `process.env` usage in the codebase must have a corresponding entry in `README.md` or `.env.example`.

### 2024-05-23 - i18n Navigation Imports

Insight: Developers frequently import `Link`, `useRouter`, etc. from `next/link` or `next/navigation` instead of the locale-aware wrappers, causing broken navigation and page reloads.
Rule: All navigation components and hooks must be imported from `@/i18n/navigation` to ensure proper locale handling and performance.

### 2025-01-13 - Missing .env.example

Insight: The `apps/web/.env.example` file was referenced in the root README installation steps but was missing from the repository, causing installation failures.
Rule: Documentation instructions must be verified by running them in a clean environment to ensure referenced files exist.

### 2025-01-14 - Copy-Paste Documentation Errors

Insight: The `README.md` contained copy-paste errors in the setup instructions (copying web env to admin), which would cause application crashes due to missing variables.
Rule: Do not assume similar-looking commands are identical. Always verify setup instructions by running them line-by-line in a clean environment.

### 2025-01-15 - Orphaned Monorepo Applications

Insight: The `apps/droid` application was completely missing from the root `README.md`, making it invisible to developers and causing setup gaps.
Rule: The root `README.md` must serve as the single source of truth for ALL applications in the `apps/` directory, including their specific environment setup commands.

## Sentinel (Security)

### 2025-02-14 - Information Leakage in Checkout API

**Vulnerability:** The Checkout API (`/api/checkout`) was catching errors from the `wayl` service and returning `error.message` directly to the client in the JSON response.
**Learning:** Returning raw error messages can expose internal system details, database connection strings, or third-party service errors to potential attackers. This information can be used to fingerprint the system or identify further attack vectors.
**Prevention:** Always catch exceptions at the API boundary and return a generic error message (e.g., "Payment creation failed") to the client. Log the specific error details internally for debugging purposes.

### 2025-05-23 - Authorization Bypass in Server Actions

**Vulnerability:** The `sendCampaign` Server Action in `apps/admin` lacked explicit authorization checks, relying solely on middleware protection which is insufficient for endpoint security.
**Learning:** Server Actions are public endpoints. Relying only on middleware creates a single point of failure and "defense in depth" gaps. If middleware is misconfigured or bypassed, the action becomes accessible to unauthorized users.
**Prevention:** Always implement explicit authentication and role-based authorization checks at the beginning of every Server Action that performs sensitive operations.

### 2026-01-16 - Insecure Session Management in Client Auth

**Vulnerability:** The login, register, and subscription pages were manually instantiating the Supabase client using `@supabase/supabase-js`. This defaults to `localStorage` for session storage, which does not sync with the server-side cookies required by `@supabase/ssr`.
**Learning:** In a Next.js App Router application using Supabase, mixing `supabase-js` (manual instantiation) and `@supabase/ssr` (cookie-based) leads to "logged in on client, logged out on server" states. This breaks server-side protection mechanisms and can lead to confusing auth failures or reliance on insecure client-side-only checks.
**Prevention:** Always use the centralized `createClient` helper from `@/lib/supabase/client` in Client Components, which is configured to use `createBrowserClient` from `@supabase/ssr` to handle cookie synchronization automatically.

## Signal (SEO)

### 2024-05-22 - Missing Structured Data for Organization
**Learning:** The root layout is missing `application/ld+json` Structured Data for the "Organization" entity. This prevents search engines from fully understanding the brand identity, logo, and official website association, which are crucial for the Knowledge Graph.
**Action:** Always check `layout.tsx` for a JSON-LD script block defining the `Organization` or `WebSite` schema. If missing, implement a `JsonLd` component to inject it.

## Testudo (Testing)

### 2024-05-23 - Vitest Alias Mismatch

Discovery: The `vitest.config.mts` mapped `@` to `./`, while `tsconfig.json` mapped `@/*` to `./src/*`. This caused imports in source files (like `@/lib/wayl`) to fail during tests because Vitest looked in the project root instead of `src`.
Strategy: Align `vitest.config.mts` aliases with `tsconfig.json` to ensure consistent module resolution between build and test environments.
