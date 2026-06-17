import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // unique id for the line item (can be product_id + variant_id)
  productId: string;
  variantId?: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  attributes?: Record<string, string>;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  totalQuantity: number;
}

// ⚡ Bolt: Compute derived totals once in a single O(N) pass during state updates
// instead of recalculating on every render via reduce() in multiple UI components.
const calculateTotals = (items: CartItem[]) => {
  let total = 0;
  let totalQuantity = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
    totalQuantity += items[i].quantity;
  }
  return { total, totalQuantity };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, _get) => ({
      items: [],
      total: 0,
      totalQuantity: 0,

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === newItem.id);
          let updatedItems: CartItem[];
          if (existing) {
            updatedItems = state.items.map((i) =>
              i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i,
            );
          } else {
            updatedItems = [...state.items, { ...newItem, quantity: 1 }];
          }

          // Recalc total
          const totals = calculateTotals(updatedItems);
          return { items: updatedItems, ...totals };
        });
      },

      removeItem: (id) => {
        set((state) => {
          const updatedItems = state.items.filter((i) => i.id !== id);
          const totals = calculateTotals(updatedItems);
          return { items: updatedItems, ...totals };
        });
      },

      updateQuantity: (id, quantity) => {
        set((state) => {
          if (quantity < 1) return state; // or remove?
          const updatedItems = state.items.map((i) =>
            i.id === id ? { ...i, quantity } : i,
          );
          const totals = calculateTotals(updatedItems);
          return { items: updatedItems, ...totals };
        });
      },

      clearCart: () => set({ items: [], total: 0, totalQuantity: 0 }),
    }),
    {
      name: 'cart-storage-v2', // v2 to reset old string storage
    },
  ),
);
