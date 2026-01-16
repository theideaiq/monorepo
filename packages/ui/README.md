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

Source code is located in `src/`. Most components are flat in the `src` directory, with exceptions noted below.

- **Badge**: `src/Badge.tsx`
- **Button**: `src/Button.tsx` (Variants: `primary`, `secondary`, `dark`, `outline`, `ghost`)
- **Card**: `src/Card.tsx`
- **Input**: `src/Input.tsx`
- **Modal**: `src/Modal.tsx`
- **Select**: `src/Select.tsx`
- **Sheet**: `src/Sheet.tsx`
- **Skeleton**: `src/skeleton/Skeleton.tsx` (Note: Located in subdirectory)
- **Spinner**: `src/Spinner.tsx`
- **Textarea**: `src/Textarea.tsx`

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
