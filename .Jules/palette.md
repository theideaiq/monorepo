## 2025-05-21 - Button Component Loading State
**Learning:** The `Button` component from `@repo/ui` prepends a spinner when `isLoading` is true but keeps the children visible. For buttons with icons, this results in two icons (spinner + original icon) unless the original icon is manually hidden.
**Action:** When adding loading states to icon-buttons, conditionally render the original icon: `{!loading && <Icon />}`.
