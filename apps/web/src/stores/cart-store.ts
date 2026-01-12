import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CartItem = string;

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (item: CartItem) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      removeItem: (item) =>
        set((state) => ({ items: state.items.filter((i) => i !== item) })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage',
    },
  ),
);
