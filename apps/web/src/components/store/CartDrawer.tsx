'use client';

import { useRouter } from 'next/navigation';
import { ShoppingBag, Trash2, Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import { memo } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { useCartStore, type CartItem } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@repo/ui';

// Optimization: Move Intl.NumberFormat instantiation outside the component to avoid re-creation on every render.
const currencyFormatter = new Intl.NumberFormat('en-IQ');

interface CartItemRowProps {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
}

// Optimization: Memoize CartItemRow to prevent re-renders of all items when only one item changes.
// This is critical for performance as the cart grows.
const CartItemRow = memo(({ item, onRemove, onUpdateQuantity }: CartItemRowProps) => {
  return (
    <div className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
      <div className="w-20 h-20 bg-black rounded-lg relative overflow-hidden flex-shrink-0">
        <Image
          src={item.image}
          alt={item.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-bold text-sm line-clamp-2">
          {item.title}
        </h4>
        {item.attributes && (
          <p className="text-xs text-slate-500 mt-1">
            {Object.entries(item.attributes)
              .map(([_, v]) => `${v}`)
              .join(', ')}
          </p>
        )}
        <p className="text-brand-yellow font-bold mt-2">
          {currencyFormatter.format(item.price)} IQD
        </p>
      </div>

      <div className="flex flex-col justify-between items-end">
        <button
          onClick={() => onRemove(item.id)}
          className="text-slate-500 hover:text-red-500 p-1"
          type="button"
        >
          <Trash2 size={16} />
        </button>

        <div className="flex items-center gap-3 bg-black/20 rounded-lg p-1">
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-50"
            disabled={item.quantity <= 1}
            type="button"
          >
            <Minus size={14} />
          </button>
          <span className="text-sm font-bold text-white w-4 text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="p-1 text-slate-400 hover:text-white"
            type="button"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

CartItemRow.displayName = 'CartItemRow';

export function CartDrawer() {
  const { isCartOpen, closeCart } = useUIStore();
  const { items, removeItem, updateQuantity, total } = useCartStore();
  const router = useRouter();

  const handleCheckout = () => {
    closeCart();
    router.push('/checkout');
  };

  const formattedTotal = currencyFormatter.format(total);

  return (
    <Drawer
      isOpen={isCartOpen}
      onClose={closeCart}
      title={`Your Cart (${items.length})`}
      footer={
        <div className="space-y-4">
          <div className="flex justify-between text-white font-bold text-lg">
            <span>Total</span>
            <span>{formattedTotal} IQD</span>
          </div>
          <Button
            className="w-full h-14 bg-brand-yellow text-brand-dark font-bold text-lg hover:bg-white"
            onClick={handleCheckout}
            disabled={items.length === 0}
          >
            Checkout
          </Button>
        </div>
      }
    >
      {items.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
          <ShoppingBag size={48} className="opacity-20" />
          <p>Your cart is empty.</p>
          <Button variant="outline" onClick={closeCart}>
            Continue Shopping
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onRemove={removeItem}
              onUpdateQuantity={updateQuantity}
            />
          ))}
        </div>
      )}
    </Drawer>
  );
}
