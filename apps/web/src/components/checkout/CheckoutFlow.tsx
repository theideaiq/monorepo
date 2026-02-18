'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Loader2,
  Lock,
  Truck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { toast } from 'react-hot-toast';
import { initiateCheckout } from '@/actions/checkout';
import { useCartStore } from '@/stores/cart-store';

interface ShippingDetails {
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  notes: string;
}

export function CheckoutFlow() {
  const router = useRouter();
  const { items, total, clearCart } = useCartStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [shipping, setShipping] = useState<ShippingDetails>({
    fullName: '',
    phoneNumber: '',
    address: '',
    city: 'Baghdad',
    notes: '',
  });

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call Server Action
      // Explicitly ignore type error for now as we fix the action signature
      // @ts-expect-error
      const result = await initiateCheckout({
        items,
        total,
        shipping,
      });

      // @ts-expect-error: result type unknown
      if (result?.error) {
        // @ts-expect-error: result type unknown
        toast.error(result.error);
        return;
      }

      toast.success('Order placed successfully!');
      clearCart();
      // @ts-expect-error
      router.push(`/checkout/success?orderId=${result.orderId}`);
    } catch (_error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 mb-6">Your cart is empty</p>
        <button
          type="button"
          onClick={() => router.push('/megastore')}
          className="bg-brand-yellow text-brand-dark px-8 py-3 rounded-full font-bold hover:bg-yellow-400 transition-colors"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
      {/* LEFT COLUMN - STEPS */}
      <div className="lg:col-span-2 space-y-6">
        {/* Step 1: Shipping */}
        <div
          className={`rounded-3xl border transition-all overflow-hidden ${step === 1 ? 'bg-white/5 border-brand-yellow/50 shadow-[0_0_20px_rgba(250,204,21,0.1)]' : 'bg-black/40 border-white/5'}`}
        >
          <button
            type="button"
            className="w-full p-6 flex items-center justify-between cursor-pointer text-left"
            onClick={() => setStep(1)}
            onKeyDown={(e) => e.key === 'Enter' && setStep(1)}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === 1 ? 'bg-brand-yellow text-brand-dark' : 'bg-white/10 text-slate-400'}`}
              >
                1
              </div>
              <h2 className="text-xl font-bold text-white">Shipping Details</h2>
            </div>
            {step > 1 && <Check className="text-green-500" />}
          </button>

          <AnimatePresence>
            {step === 1 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="p-6 pt-0 border-t border-white/5">
                  <form
                    id="shipping-form"
                    className="space-y-4 pt-6"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setStep(2);
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label
                          htmlFor="fullName"
                          className="text-xs text-slate-400"
                        >
                          Full Name
                        </label>
                        <input
                          id="fullName"
                          required
                          value={shipping.fullName}
                          onChange={(e) =>
                            setShipping({
                              ...shipping,
                              fullName: e.target.value,
                            })
                          }
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-yellow outline-none text-white text-sm"
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-1">
                        <label
                          htmlFor="phoneNumber"
                          className="text-xs text-slate-400"
                        >
                          Phone Number
                        </label>
                        <input
                          id="phoneNumber"
                          required
                          type="tel"
                          value={shipping.phoneNumber}
                          onChange={(e) =>
                            setShipping({
                              ...shipping,
                              phoneNumber: e.target.value,
                            })
                          }
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-yellow outline-none text-white text-sm"
                          placeholder="07XX XXX XXXX"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="address"
                        className="text-xs text-slate-400"
                      >
                        Address
                      </label>
                      <input
                        id="address"
                        required
                        value={shipping.address}
                        onChange={(e) =>
                          setShipping({ ...shipping, address: e.target.value })
                        }
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-yellow outline-none text-white text-sm"
                        placeholder="Street, Building, Apartment"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label
                          htmlFor="city"
                          className="text-xs text-slate-400"
                        >
                          City
                        </label>
                        <select
                          id="city"
                          value={shipping.city}
                          onChange={(e) =>
                            setShipping({ ...shipping, city: e.target.value })
                          }
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-yellow outline-none text-white text-sm appearance-none"
                        >
                          <option value="Baghdad">Baghdad</option>
                          <option value="Basra">Basra</option>
                          <option value="Erbil">Erbil</option>
                          <option value="Najaf">Najaf</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label
                          htmlFor="notes"
                          className="text-xs text-slate-400"
                        >
                          Delivery Notes (Optional)
                        </label>
                        <input
                          id="notes"
                          value={shipping.notes}
                          onChange={(e) =>
                            setShipping({ ...shipping, notes: e.target.value })
                          }
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-yellow outline-none text-white text-sm"
                          placeholder="Near landmarks..."
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        className="bg-brand-yellow text-brand-dark px-8 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors flex items-center gap-2"
                      >
                        Continue to Payment <ArrowRight size={18} />
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 2: Payment */}
        <div
          className={`rounded-3xl border transition-all overflow-hidden ${step === 2 ? 'bg-white/5 border-brand-yellow/50 shadow-[0_0_20px_rgba(250,204,21,0.1)]' : 'bg-black/40 border-white/5'}`}
        >
          <div className="p-6 flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === 2 ? 'bg-brand-yellow text-brand-dark' : 'bg-white/10 text-slate-400'}`}
            >
              2
            </div>
            <h2 className="text-xl font-bold text-white">Payment Method</h2>
          </div>

          <AnimatePresence>
            {step === 2 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="p-6 pt-0 border-t border-white/5">
                  <div className="pt-6 grid gap-4">
                    <div className="p-4 rounded-xl border border-brand-yellow bg-brand-yellow/5 flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand-yellow/20 flex items-center justify-center text-brand-yellow">
                          <Truck size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-white">
                            Cash on Delivery
                          </p>
                          <p className="text-xs text-slate-400">
                            Pay when you receive your order
                          </p>
                        </div>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-brand-yellow flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-yellow" />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-white/5 bg-black/20 flex items-center justify-between opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-400">
                            Credit Card (Coming Soon)
                          </p>
                          <p className="text-xs text-slate-500">
                            Secure online payment
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckout}
                      disabled={loading}
                      className="bg-brand-yellow text-brand-dark px-8 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />{' '}
                          Processing...
                        </>
                      ) : (
                        <>
                          Place Order <Check size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT COLUMN - SUMMARY */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sticky top-24">
        <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>
        <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4">
              <div className="w-16 h-16 bg-white/5 rounded-lg relative overflow-hidden shrink-0">
                {/* Image placeholder */}
                <div className="absolute inset-0 bg-slate-800" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white line-clamp-2">
                  {item.title}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Qty: {item.quantity} × {item.price.toLocaleString()} IQD
                </p>
              </div>
              <div className="text-sm font-bold text-white">
                {(item.price * item.quantity).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-6 border-t border-white/10">
          <div className="flex justify-between text-slate-400 text-sm">
            <span>Subtotal</span>
            <span>{total.toLocaleString()} IQD</span>
          </div>
          <div className="flex justify-between text-slate-400 text-sm">
            <span>Shipping</span>
            <span className="text-brand-yellow">Free</span>
          </div>
          <div className="flex justify-between text-white font-black text-xl pt-4 border-t border-white/10">
            <span>Total</span>
            <span>{total.toLocaleString()} IQD</span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 justify-center">
          <Lock size={12} /> Secure Checkout
        </div>
      </div>
    </div>
  );
}

// Helper component for icons to reduce imports in main file if needed,
// but lucide-react is tree-shakeable.
function ArrowRight({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Arrow right"
    >
      <title>Arrow right</title>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
