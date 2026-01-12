'use client';

import { Badge } from '@/components/ui/Badge';
// UI Kit
import { Button } from '@/components/ui/Button';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { BookOpen, Check, Gamepad2, Loader2, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';

interface Tier {
  id: string;
  name: string;
  price: string;
  amount: number;
  color: string;
  icon: ReactNode;
  features: string[];
  button: string;
  popular?: boolean;
  textColor?: string;
}

const supabase = createClient(
  // biome-ignore lint/style/noNonNullAssertion: migration
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // biome-ignore lint/style/noNonNullAssertion: migration
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function PlusHome() {
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const tiers: Tier[] = [
    {
      id: 'essential',
      name: 'IDEA Essential',
      price: '15,000',
      amount: 15000,
      color: 'bg-slate-700',
      icon: <BookOpen className="w-6 h-6" />,
      features: [
        'Access to 5,000+ Books',
        '1 Book Rental at a time',
        'Standard Delivery',
      ],
      button: 'Join Essential',
    },
    {
      id: 'extra',
      name: 'IDEA Extra',
      price: '25,000',
      amount: 25000,
      color: 'bg-brand-yellow',
      textColor: 'text-brand-dark',
      icon: <Gamepad2 className="w-6 h-6 text-brand-dark" />,
      features: [
        'Everything in Essential',
        'Access to PS5 & Switch Games',
        '2 Rentals at a time',
        'Faster Delivery',
      ],
      button: 'Join Extra',
      popular: true,
    },
    {
      id: 'premium',
      name: 'IDEA Premium',
      price: '40,000',
      amount: 40000,
      color: 'bg-brand-pink',
      icon: <Zap className="w-6 h-6 text-white" />,
      features: [
        'Everything in Extra',
        '4K Blu-ray Movie Library',
        '3 Rentals at a time',
        'Same-Day Delivery',
      ],
      button: 'Join Premium',
    },
  ];

  const handleSubscribe = async (tier: Tier) => {
    setLoadingTier(tier.id);

    // 1. Check if user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Please log in or register first');
      router.push('/register');
      setLoadingTier(null);
      return;
    }

    try {
      // 2. Call our API Bridge
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: tier.amount,
          planName: tier.name,
          userEmail: user.email,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // 3. Redirect to Wayl (ZainCash/FIB)
        window.location.href = data.url;
      } else {
        toast.error('Payment system offline. Try again.');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1014] text-white font-sans -mt-20 pt-20">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1014] via-[#0f1014]/50 to-transparent" />

        <div className="relative z-10 text-center max-w-4xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge
              variant="warning"
              className="mb-6 px-4 py-1 text-sm tracking-widest"
            >
              THE ULTIMATE SUBSCRIPTION
            </Badge>
            <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-6">
              UNLEASH <br />{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-brand-pink">
                YOUR PLAY.
              </span>
            </h1>
            <p className="text-lg md:text-2xl text-slate-300 mb-10 font-light max-w-2xl mx-auto">
              Books, Games, and Movies delivered to your door in Baghdad.
            </p>
            <Button
              className="bg-brand-yellow text-brand-dark hover:bg-yellow-400 h-14 px-10 text-lg rounded-full"
              onClick={() =>
                document
                  .getElementById('tiers')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              View Plans
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Tiers Section */}
      <section id="tiers" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Choose Your Tier
          </h2>
          <p className="text-slate-400">Cancel anytime. No hidden fees.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: static list
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative flex flex-col p-8 rounded-3xl ${tier.popular ? 'bg-slate-800 border-2 border-brand-yellow shadow-2xl scale-105 z-10' : 'bg-[#18191d] border border-white/5'} transition-all`}
            >
              {tier.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-brand-yellow text-brand-dark text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <div className="mb-8">
                <div
                  className={`w-12 h-12 rounded-xl ${tier.color} flex items-center justify-center mb-6`}
                >
                  {tier.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-sm text-slate-500">IQD / mo</span>
                </div>
              </div>
              <ul className="flex-1 space-y-4 mb-8">
                {tier.features.map((feature, f) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: static list
                    key={f}
                    className="flex items-start gap-3 text-sm text-slate-300"
                  >
                    <Check
                      className={`w-5 h-5 ${tier.popular ? 'text-brand-yellow' : 'text-slate-500'} shrink-0`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleSubscribe(tier)}
                disabled={loadingTier !== null}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                  ${
                    tier.popular
                      ? 'bg-brand-yellow text-brand-dark hover:bg-yellow-400'
                      : 'bg-white/10 text-white hover:bg-white hover:text-black'
                  }
                  ${loadingTier !== null ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {loadingTier === tier.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  tier.button
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
