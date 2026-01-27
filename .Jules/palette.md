## 2025-02-19 - Drawer Accessibility
**Learning:** Custom UI components like `Drawer` often miss critical accessibility features like `role="dialog"`, `aria-modal="true"`, and keyboard support (Escape key), making them unusable for screen readers and keyboard users.
**Action:** When creating or modifying overlays/modals, always implement `role="dialog"`, `aria-modal="true"`, correct labelling (`aria-labelledby`), and close-on-escape functionality.
