'use client';

import { Button } from '@repo/ui';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  MapPin,
  Package,
} from 'lucide-react';
import { useState } from 'react';

export function CheckoutFlow() {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNext = () => setStep((s) => Math.min(3, s + 1));

  const handleComplete = async () => {
    setIsProcessing(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 2000));
    window.location.href = '/checkout?success=true';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-2 space-y-6">
        {/* Step 1: Shipping */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border transition-all overflow-hidden ${step === 1 ? 'bg-white/5 border-brand-yellow/50 shadow-[0_0_20px_rgba(250,204,21,0.1)]' : 'bg-black/40 border-white/5'}`}
        >
          <button
            type="button"
            className="w-full text-left p-6 flex items-center justify-between"
            onClick={() => setStep(1)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setStep(1);
              }
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step > 1 ? 'bg-brand-yellow text-black' : step === 1 ? 'bg-white/10 text-brand-yellow' : 'bg-white/5 text-slate-500'}`}
              >
                {step > 1 ? <CheckCircle2 size={20} /> : '1'}
              </div>
              <h2
                className={`text-xl font-bold ${step === 1 ? 'text-white' : 'text-slate-400'}`}
              >
                Shipping Details
              </h2>
            </div>
            {step === 1 && (
              <ChevronRight className="text-brand-yellow" size={24} />
            )}
          </button>

          {step === 1 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="p-6 pt-0"
            >
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleNext();
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
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-all"
                      placeholder="Ali Ahmed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="phone" className="text-xs text-slate-400">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      required
                      type="tel"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-all"
                      placeholder="0770 000 0000"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label htmlFor="address" className="text-xs text-slate-400">
                      Delivery Address
                    </label>
                    <textarea
                      id="address"
                      required
                      rows={3}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-all resize-none"
                      placeholder="Street, Area, Baghdad"
                    />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button type="submit" className="bg-white text-black px-8">
                    Continue to Payment
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </motion.div>

        {/* Step 2: Payment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-3xl border transition-all overflow-hidden ${step === 2 ? 'bg-white/5 border-brand-yellow/50 shadow-[0_0_20px_rgba(250,204,21,0.1)]' : 'bg-black/40 border-white/5'}`}
        >
          <button
            type="button"
            className="w-full text-left p-6 flex items-center justify-between"
            onClick={() => step > 1 && setStep(2)}
            onKeyDown={(e) => {
              if (step > 1 && (e.key === 'Enter' || e.key === ' ')) {
                setStep(2);
              }
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step > 2 ? 'bg-brand-yellow text-black' : step === 2 ? 'bg-white/10 text-brand-yellow' : 'bg-white/5 text-slate-600'}`}
              >
                {step > 2 ? <CheckCircle2 size={20} /> : '2'}
              </div>
              <h2
                className={`text-xl font-bold ${step === 2 ? 'text-white' : 'text-slate-500'}`}
              >
                Payment Method
              </h2>
            </div>
            {step === 2 && (
              <ChevronRight className="text-brand-yellow" size={24} />
            )}
          </button>

          {step === 2 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="p-6 pt-0"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  type="button"
                  className="p-4 border-2 border-brand-yellow rounded-2xl bg-brand-yellow/5 flex flex-col items-center gap-3"
                >
                  <CreditCard size={32} className="text-brand-yellow" />
                  <span className="font-bold">Card Payment</span>
                </button>
                <button
                  type="button"
                  className="p-4 border-2 border-white/10 rounded-2xl hover:border-white/30 flex flex-col items-center gap-3 transition-colors text-slate-400"
                >
                  <MapPin size={32} />
                  <span className="font-bold">Cash on Delivery</span>
                </button>
              </div>

              {/* Mock Card Form */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="card" className="text-xs text-slate-400">
                    Card Number
                  </label>
                  <input
                    id="card"
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-all font-mono"
                    placeholder="0000 0000 0000 0000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="expiry" className="text-xs text-slate-400">
                      Expiry Date
                    </label>
                    <input
                      id="expiry"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-all font-mono"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="cvv" className="text-xs text-slate-400">
                      CVV
                    </label>
                    <input
                      id="cvv"
                      type="password"
                      maxLength={4}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-all font-mono"
                      placeholder="123"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8 flex justify-end">
                <Button
                  onClick={handleNext}
                  className="bg-white text-black px-8"
                >
                  Review Order
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Step 3: Review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-3xl border transition-all overflow-hidden ${step === 3 ? 'bg-white/5 border-brand-yellow/50 shadow-[0_0_20px_rgba(250,204,21,0.1)]' : 'bg-black/40 border-white/5'}`}
        >
          <div className="p-6 flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === 3 ? 'bg-white/10 text-brand-yellow' : 'bg-white/5 text-slate-600'}`}
            >
              3
            </div>
            <h2
              className={`text-xl font-bold ${step === 3 ? 'text-white' : 'text-slate-500'}`}
            >
              Review & Submit
            </h2>
          </div>

          {step === 3 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="p-6 pt-0"
            >
              <div className="bg-black rounded-2xl p-6 border border-white/10 mb-6">
                <h3 className="font-bold text-white mb-4">Order Summary</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Logitech G Pro X</span>
                    <span>150,000 IQD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Shipping</span>
                    <span>5,000 IQD</span>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-between font-bold text-lg text-brand-yellow">
                    <span>Total</span>
                    <span>155,000 IQD</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleComplete}
                isLoading={isProcessing}
                className="w-full h-14 text-lg font-bold bg-brand-yellow text-black hover:bg-white transition-colors"
              >
                Confirm Purchase
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Cart Summary Sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-32 bg-[#1a1a1a] rounded-3xl border border-white/10 p-8">
          <h3 className="text-xl font-black mb-6">Your Cart</h3>
          {/* Mock Items */}
          <div className="space-y-4 mb-8">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-black rounded-xl border border-white/10" />
              <div>
                <h4 className="font-bold text-sm">Logitech G Pro X</h4>
                <p className="text-brand-yellow font-medium mt-1 text-sm">
                  150,000 IQD
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3 text-sm border-t border-white/10 pt-6">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="text-white">150,000 IQD</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Shipping</span>
              <span className="text-white">Calculated next step</span>
            </div>
            <div className="flex justify-between font-black text-lg pt-3 border-t border-white/10">
              <span>Total</span>
              <span className="text-brand-yellow">150,000 IQD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
