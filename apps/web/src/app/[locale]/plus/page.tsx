'use client';

import { Button } from '@repo/ui';
import { motion } from 'framer-motion';
import { Check, Star, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { SubscriptionCard } from '@/components/checkout/SubscriptionCard';

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    currency: 'IQD',
    interval: 'mo',
    description: 'Perfect for trying out The IDEA.',
    features: ['Access to Megastore', 'Basic Support', 'Community Access'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 15000,
    currency: 'IQD',
    interval: 'mo',
    description: 'For serious builders and creators.',
    features: [
      'Everything in Starter',
      'Priority Support',
      'Exclusive Deals',
      'Early Access',
      'Zero Fees',
    ],
    popular: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 45000,
    currency: 'IQD',
    interval: 'mo',
    description: 'Ultimate access and VIP treatment.',
    features: [
      'Everything in Pro',
      '24/7 Dedicated Support',
      'Concierge Service',
      'Private Events',
      'Investment Opportunities',
    ],
  },
];

export default function PlusPage() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly',
  );

  const handleSubscribe = (tierId: string) => {
    setSelectedTier(tierId);
    toast.success(`Selected ${tierId.toUpperCase()} plan`);
    // Redirect to checkout or stripe
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20">
      {/* Header */}
      <div className="text-center px-4 max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-yellow/10 text-brand-yellow text-xs font-bold tracking-widest mb-6 border border-brand-yellow/20">
          <Zap size={14} className="fill-brand-yellow" /> THE IDEA PLUS
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
          Unlock the full <br />
          <span className="text-brand-yellow">potential.</span>
        </h1>
        <p className="text-xl text-slate-400 leading-relaxed">
          Join the exclusive club of builders, creators, and innovators. Get
          access to premium tools, deals, and community.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex justify-center mb-16">
        <div className="bg-white/5 p-1 rounded-full border border-white/10 flex relative">
          <motion.div
            layout
            className="absolute top-1 bottom-1 bg-brand-yellow rounded-full z-0"
            initial={false}
            animate={{
              left: billingCycle === 'monthly' ? 4 : '50%',
              width: 'calc(50% - 4px)',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-colors ${
              billingCycle === 'monthly' ? 'text-black' : 'text-slate-400'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-colors ${
              billingCycle === 'yearly' ? 'text-black' : 'text-slate-400'
            }`}
          >
            Yearly <span className="text-[10px] opacity-70">-20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-8">
        {TIERS.map((tier) => (
          <SubscriptionCard
            key={tier.id}
            plan={{
              ...tier,
              price:
                billingCycle === 'yearly' ? tier.price * 12 * 0.8 : tier.price,
              interval: billingCycle === 'yearly' ? 'yr' : 'mo',
            }}
            isSelected={selectedTier === tier.id}
            onSelect={() => handleSubscribe(tier.id)}
          />
        ))}
      </div>

      {/* Comparison Table (Desktop) */}
      <div className="hidden md:block max-w-5xl mx-auto mt-32 px-4">
        <h3 className="text-3xl font-bold text-center mb-12">
          Compare Features
        </h3>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-6 text-left text-sm font-bold text-slate-400 uppercase tracking-wider w-1/3">
                  Feature
                </th>
                {TIERS.map((tier) => (
                  <th
                    key={tier.id}
                    className={`p-6 text-center text-lg font-bold ${
                      tier.id === 'pro' ? 'text-brand-yellow' : 'text-white'
                    }`}
                  >
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                'Megastore Access',
                'Community Access',
                'Priority Support',
                'Exclusive Deals',
                'Zero Fees',
                'Concierge',
              ].map((feature) => (
                <tr key={feature} className="hover:bg-white/5 transition-colors">
                  <td className="p-6 text-sm font-medium text-slate-300">
                    {feature}
                  </td>
                  {TIERS.map((tier) => (
                    <td key={tier.id} className="p-6 text-center">
                      {tier.features.some((f) => f.includes(feature) || f.includes('Everything')) ? (
                        <Check
                          size={20}
                          className={`mx-auto ${
                            tier.id === 'pro'
                              ? 'text-brand-yellow'
                              : tier.id === 'elite'
                                ? 'text-purple-400'
                                : 'text-slate-500'
                          }`}
                        />
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto mt-32 px-4">
        <h3 className="text-3xl font-bold text-center mb-12">
          Frequently Asked Questions
        </h3>
        <div className="space-y-6">
          {[
            {
              q: 'Can I cancel anytime?',
              a: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.',
            },
            {
              q: 'What payment methods do you accept?',
              a: 'We accept ZainCash, FIB, MasterCard, and Visa. All payments are secure and encrypted.',
            },
            {
              q: 'Is there a student discount?',
              a: 'Yes! Students with a valid ID get 50% off the Pro plan. Contact support to apply.',
            },
          ].map((item, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: Static FAQ list
              key={i}
              className="bg-white/5 border border-white/10 p-6 rounded-2xl"
            >
              <h4 className="font-bold text-lg mb-2">{item.q}</h4>
              <p className="text-slate-400">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
