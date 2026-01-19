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

For **Tailwind CSS 4**, add the `@source` directive to your application's main CSS file:

```css
@import "tailwindcss";
@source "../../../packages/ui"; /* Adjust path relative to your CSS file */
```

## 🧱 Components

Source code is located in `src/`. Components are organized in their own directories.

- **AppShell**: `src/app-shell/AppShell.tsx` (Standardized layout wrapper)
- **Badge**: `src/badge/Badge.tsx` (Variants: `success`, `warning`, `danger`, `neutral`, `brand`)
- **Button**: `src/button/Button.tsx` (Variants: `primary`, `secondary`, `dark`, `outline`, `ghost`, `link`, `destructive`)
- **Card**: `src/card/Card.tsx`
- **Footer**: `src/footer/Footer.tsx`
- **Input**: `src/input/Input.tsx`
- **MetricCard**: `src/metric-card/MetricCard.tsx` (Includes trend indicators)
- **Modal**: `src/modal/Modal.tsx`
- **Navbar**: `src/navbar/Navbar.tsx`
- **Select**: `src/select/Select.tsx`
- **Sheet**: `src/sheet/Sheet.tsx`
- **Skeleton**: `src/skeleton/Skeleton.tsx`
- **Spinner**: `src/spinner/Spinner.tsx`
- **Table**: `src/table/Table.tsx`
- **Textarea**: `src/textarea/Textarea.tsx`

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
