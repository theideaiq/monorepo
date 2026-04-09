## 2024-04-09 - Accessible Icon Buttons in Cart
**Learning:** Icon-only buttons (like Trash, Plus, Minus) in iterative components like the `CartDrawer` often lack `aria-label`s, making them invisible or confusing to screen reader users who navigate the cart.
**Action:** When adding icon-only action buttons (especially inside lists or mapped elements), always explicitly define an `aria-label` that provides context (e.g., `Remove ${item.title} from cart`) rather than a generic label.
