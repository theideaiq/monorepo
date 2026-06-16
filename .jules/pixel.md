## 2025-02-28 - Badge variant invalid usage
**Learning:** The `Badge` component has specific valid variants ('success', 'warning', 'danger', 'neutral', 'brand'). Using unsupported variants like 'secondary' causes styling issues or fallback to default styles. This was specifically observed in the admin transactions page.
**Action:** Always check the allowed `variant` props defined in the UI component (`BadgeProps`) before using them. Update instances of invalid variants to a supported one (e.g., 'neutral' instead of 'secondary').
