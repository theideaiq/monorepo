# @repo/ui

A shared React component library for the IDEA IQ monorepo, built with **React 19** and **Tailwind CSS 4**.

## 🛠 Tech Stack

- **Framework**: React 19
- **Styling**: Tailwind CSS 4
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Primitives**: Radix UI
- **Testing**: Vitest, React Testing Library
- **Documentation**: Storybook 8

## 📦 Installation

This package is designed to be used within the monorepo. Add it to your app's `package.json`:

```json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

## 🧩 Usage

Import components directly from the package:

```tsx
import { Button } from '@repo/ui';

export default function Page() {
  return (
    <Button variant="primary" onClick={() => console.log('Clicked!')}>
      Click Me
    </Button>
  );
}
```

### 🎨 Styles

Ensure your application's Tailwind configuration includes the UI package content to generate styles correctly.

For **Tailwind CSS 4**, add the `@source` directive and import the theme variables in your application's main CSS file (e.g., `apps/web/src/app/globals.css`):

```css
@import "tailwindcss";
@import "../../../../packages/ui/src/theme.css"; /* Adjust path relative to your CSS file */
@source "../../../../packages/ui";
```

**Note:** The paths must be relative to the CSS file location. For a standard Next.js app structure (`apps/<app-name>/src/app/globals.css`), the path is `../../../../packages/ui`.

### 🔗 Link Injection Pattern

To keep components framework-agnostic (avoiding direct dependencies on `next/link`), navigation components like `Navbar` and `Footer` require a `Link` component to be injected via props.

```tsx
import { Link } from '@/i18n/navigation'; // Local app link
import { Navbar } from '@repo/ui';

<Navbar
  Link={Link}
  logo={<Logo />}
  // ...
/>
```

## 🧱 Components

Source code is located in `src/`. Components are organized in their own directories.

- **AppShell**: `src/app-shell/AppShell.tsx` (Standardized layout wrapper with skip-link)
- **Badge**: `src/badge/Badge.tsx` (Status indicators)
- **Button**: `src/button/Button.tsx` (Primary actions with loading states)
- **Card**: `src/card/Card.tsx` (Content containers)
- **Footer**: `src/footer/Footer.tsx` (Multi-column footer)
- **Input**: `src/input/Input.tsx` (Form inputs with validation states)
- **MetricCard**: `src/metric-card/MetricCard.tsx` (Dashboard metrics with trends)
- **Modal**: `src/modal/Modal.tsx` (Accessible dialogs with focus trapping)
- **Navbar**: `src/navbar/Navbar.tsx` (Responsive navigation)
- **Select**: `src/select/Select.tsx` (Native select with custom styling)
- **Sheet**: `src/sheet/Sheet.tsx` (Sidebars/Drawers powered by Radix UI)
- **Skeleton**: `src/skeleton/Skeleton.tsx` (Loading placeholders)
- **Spinner**: `src/spinner/Spinner.tsx` (Loading indicators)
- **Table**: `src/table/Table.tsx` (Responsive data tables)
- **Textarea**: `src/textarea/Textarea.tsx` (Multi-line inputs)

## 📜 Scripts

Run these scripts from the root using `pnpm`:

```bash
# Run unit tests
pnpm test --filter @repo/ui

# Start Storybook development server
pnpm --filter @repo/ui storybook

# Build Storybook static site
pnpm --filter @repo/ui build-storybook

# Lint and format
pnpm --filter @repo/ui check
```
