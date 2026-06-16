'use client';

import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@repo/ui';
import { CartItem } from './CartItem';

export function CartDrawer() {
  const { isCartOpen, closeCart } = useUIStore();
  const { items, removeItem, updateQuantity, total } = useCartStore();
  const router = useRouter();

  const handleCheckout = () => {
    closeCart();
    router.push('/checkout');
  };

  const formattedTotal = new Intl.NumberFormat('en-IQ').format(total);

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
            <CartItem
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
