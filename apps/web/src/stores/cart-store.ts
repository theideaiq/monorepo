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
}

export const useCartStore = create<CartState>()(
  persist(
    (set, _get) => ({
      items: [],
      total: 0,

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === newItem.id);
          let updatedItems;
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
          return { items: updatedItems, total };
        });
      },

      removeItem: (id) => {
        set((state) => {
          const updatedItems = state.items.filter((i) => i.id !== id);
          const total = updatedItems.reduce(
            (acc, i) => acc + i.price * i.quantity,
            0,
          );
          return { items: updatedItems, total };
        });
      },

      updateQuantity: (id, quantity) => {
        set((state) => {
          if (quantity < 1) return state; // or remove?
          const updatedItems = state.items.map((i) =>
            i.id === id ? { ...i, quantity } : i,
          );
          const total = updatedItems.reduce(
            (acc, i) => acc + i.price * i.quantity,
            0,
          );
          return { items: updatedItems, total };
        });
      },

      clearCart: () => set({ items: [], total: 0 }),
    }),
    {
      name: 'cart-storage-v2', // v2 to reset old string storage
    },
  ),
);
