import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, _get) => ({
      items: [],
      total: 0,
      addItem: (newItem) =>
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
          return {
            items: updatedItems,
            total: updatedItems.reduce(
              (sum, i) => sum + i.price * i.quantity,
              0,
            ),
          };
        }),
      removeItem: (itemId) =>
        set((state) => {
          const updatedItems = state.items.filter((i) => i.id !== itemId);
          return {
            items: updatedItems,
            total: updatedItems.reduce(
              (sum, i) => sum + i.price * i.quantity,
              0,
            ),
          };
        }),
      clearCart: () => set({ items: [], total: 0 }),
    }),
    {
      name: 'cart-storage',
    },
  ),
);
