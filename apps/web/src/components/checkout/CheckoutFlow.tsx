'use client';

import { Button } from '@repo/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CreditCard, Loader2, Lock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useCartStore } from '@/stores/cart-store';

export function CheckoutFlow() {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const { total, items } = useCartStore();

  const [address, setAddress] = useState({
    fullName: '',
    phone: '',
    city: 'Baghdad',
    street: '',
    note: '',
  });

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
    // In real app, save address to profile/context
  };

  const handlePayment = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
    toast.success('Order placed successfully!');
    // Redirect or clear cart
  };

  const formattedTotal = new Intl.NumberFormat('en-IQ').format(total);

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
      <div className="lg:col-span-2 space-y-4">
        {/* STEP 1: ADDRESS */}
        <div
          className={`rounded-3xl border transition-all overflow-hidden ${step === 1 ? 'bg-white/5 border-brand-yellow/50 shadow-[0_0_20px_rgba(250,204,21,0.1)]' : 'bg-black/40 border-white/5'}`}
        >
          <div
            className="p-6 flex items-center justify-between cursor-pointer"
            onClick={() => setStep(1)}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step === 1 ? 'bg-brand-yellow text-brand-dark' : 'bg-white/10 text-slate-400'}`}
              >
                {step > 1 ? <Check size={20} /> : '1'}
              </div>
              <h3
                className={`text-xl font-bold ${step === 1 ? 'text-white' : 'text-slate-400'}`}
              >
                Shipping Address
              </h3>
            </div>
            {step > 1 && (
              <button
                type="button"
                className="text-sm text-brand-yellow font-medium"
              >
                Edit
              </button>
            )}
          </div>

          <AnimatePresence>
            {step === 1 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="p-6 pt-0 border-t border-white/5">
                  <form
                    onSubmit={handleAddressSubmit}
                    className="space-y-4 mt-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">
                          Full Name
                        </label>
                        <input
                          required
                          value={address.fullName}
                          onChange={(e) =>
                            setAddress({ ...address, fullName: e.target.value })
                          }
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-brand-yellow outline-none"
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">
                          Phone Number
                        </label>
                        <input
                          required
                          value={address.phone}
                          onChange={(e) =>
                            setAddress({ ...address, phone: e.target.value })
                          }
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-brand-yellow outline-none"
                          placeholder="07xxxxxxxxx"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">City</label>
                      <select
                        value={address.city}
                        onChange={(e) =>
                          setAddress({ ...address, city: e.target.value })
                        }
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-brand-yellow outline-none appearance-none"
                      >
                        <option value="Baghdad">Baghdad</option>
                        <option value="Basra">Basra</option>
                        <option value="Erbil">Erbil</option>
                        {/* ... other cities */}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">
                        Address Details
                      </label>
                      <textarea
                        required
                        value={address.street}
                        onChange={(e) =>
                          setAddress({ ...address, street: e.target.value })
                        }
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-brand-yellow outline-none min-h-[100px]"
                        placeholder="Street name, Building No., Landmark..."
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        type="submit"
                        className="bg-brand-yellow text-brand-dark px-8 h-12 font-bold"
                      >
                        Continue to Payment
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* STEP 2: PAYMENT */}
        <div
          className={`rounded-3xl border transition-all overflow-hidden ${step === 2 ? 'bg-white/5 border-brand-yellow/50 shadow-[0_0_20px_rgba(250,204,21,0.1)]' : 'bg-black/40 border-white/5'}`}
        >
          <div className="p-6 flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step === 2 ? 'bg-brand-yellow text-brand-dark' : 'bg-white/10 text-slate-400'}`}
            >
              {step < 2 ? <Lock size={18} /> : '2'}
            </div>
            <h3
              className={`text-xl font-bold ${step === 2 ? 'text-white' : 'text-slate-400'}`}
            >
              Payment Method
            </h3>
          </div>

          <AnimatePresence>
            {step === 2 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="p-6 pt-0 border-t border-white/5">
                  <div className="grid gap-4 mt-4">
                    {/* Payment Options */}
                    <label className="flex items-center gap-4 p-4 rounded-xl border border-brand-yellow bg-brand-yellow/10 cursor-pointer">
                      <input
                        type="radio"
                        name="payment"
                        defaultChecked
                        className="text-brand-yellow focus:ring-brand-yellow"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-white flex items-center gap-2">
                          <CreditCard size={18} /> Pay via Wayl
                        </div>
                        <div className="text-xs text-slate-400">
                          ZainCash, FIB, MasterCard, Visa
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer opacity-50">
                      <input
                        type="radio"
                        name="payment"
                        disabled
                        className="text-brand-yellow"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-slate-400">
                          Cash on Delivery
                        </div>
                        <div className="text-xs text-slate-500">
                          Currently unavailable for high-value items
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="mt-8">
                    <Button
                      onClick={handlePayment}
                      disabled={loading}
                      className="w-full h-14 bg-brand-yellow text-brand-dark font-black text-lg flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="animate-spin" />}
                      PAY {formattedTotal} IQD
                    </Button>
                    <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-1">
                      <Lock size={12} /> Secure 256-bit SSL Encrypted Payment
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ORDER SUMMARY */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Order Summary</h3>
          <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="w-12 h-12 bg-black rounded flex-shrink-0 relative overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute bottom-0 right-0 bg-brand-yellow text-brand-dark text-[10px] font-bold px-1 rounded-tl">
                    {item.quantity}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-300 truncate">
                    {item.title}
                  </div>
                  <div className="text-xs text-brand-yellow font-bold">
                    {new Intl.NumberFormat('en-IQ').format(
                      item.price * item.quantity,
                    )}{' '}
                    IQD
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span>{formattedTotal} IQD</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Delivery</span>
              <span className="text-green-400">Free</span>
            </div>
          </div>

          <div className="flex justify-between text-white font-bold text-lg pt-4 border-t border-white/10 mt-4">
            <span>Total</span>
            <span>{formattedTotal} IQD</span>
          </div>
        </div>
      </div>
    </div>
  );
}
