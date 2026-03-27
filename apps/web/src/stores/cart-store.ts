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
  totalItems: number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      total: 0,
      totalItems: 0,

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
          const total = updatedItems.reduce(
            (acc, i) => acc + i.price * i.quantity,
            0,
          );
          // ⚡ Bolt: O(1) state update for total items instead of O(n) reduce on render
          return {
            items: updatedItems,
            total,
            totalItems: state.totalItems + 1,
          };
        });
      },

      removeItem: (id) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === id);
          if (!existing) return state;

          const updatedItems = state.items.filter((i) => i.id !== id);
          const total = updatedItems.reduce(
            (acc, i) => acc + i.price * i.quantity,
            0,
          );
          // ⚡ Bolt: O(1) state update for total items instead of O(n) reduce on render
          return {
            items: updatedItems,
            total,
            totalItems: state.totalItems - existing.quantity,
          };
        });
      },

      updateQuantity: (id, quantity) => {
        set((state) => {
          if (quantity < 1) return state; // or remove?
          const existing = state.items.find((i) => i.id === id);
          if (!existing) return state;

          const updatedItems = state.items.map((i) =>
            i.id === id ? { ...i, quantity } : i,
          );
          const total = updatedItems.reduce(
            (acc, i) => acc + i.price * i.quantity,
            0,
          );
          // ⚡ Bolt: O(1) state update for total items instead of O(n) reduce on render
          return {
            items: updatedItems,
            total,
            totalItems: state.totalItems + (quantity - existing.quantity),
          };
        });
      },

      clearCart: () => set({ items: [], total: 0, totalItems: 0 }),
    }),
    {
      name: 'cart-storage-v3', // v3 to reset old string storage and ensure totalItems gets initialized correctly
    },
  ),
);
