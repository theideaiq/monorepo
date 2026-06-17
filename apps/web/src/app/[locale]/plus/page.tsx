'use client';

import { Badge, Button } from '@repo/ui';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Check,
  Gamepad2,
  Zap,
  Crown,
  Film,
  Music,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface Tier {
  id: string;
  name: string;
  price: string;
  amount: number;
  color: string;
  textColor: string;
  icon: ReactNode;
  features: string[];
  button: string;
  popular?: boolean;
  accent: string;
}

const supabase = createClient();

export default function PlusHome() {
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const tiers: Tier[] = [
    {
      id: 'essential',
      name: 'Essential',
      price: '15,000',
      amount: 15000,
      color: 'bg-slate-800',
      textColor: 'text-white',
      accent: 'border-slate-700',
      icon: <BookOpen className="w-6 h-6 text-slate-300" />,
      features: [
        'Access to 5,000+ Books',
        '1 Book Rental at a time',
        'Standard Delivery (24h)',
        'Community Access',
      ],
      button: 'Start Essential',
    },
    {
      id: 'extra',
      name: 'Extra',
      price: '25,000',
      amount: 25000,
      color: 'bg-brand-yellow',
      textColor: 'text-brand-dark',
      accent:
        'border-brand-yellow shadow-[0_0_40px_-10px_rgba(250,204,21,0.3)]',
      icon: <Gamepad2 className="w-6 h-6 text-brand-dark" />,
      features: [
        'Everything in Essential',
        'PS5 & Switch Games',
        '2 Rentals at a time',
        'Faster Delivery (6h)',
        'Priority Support',
      ],
      button: 'Get Extra',
      popular: true,
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '40,000',
      amount: 40000,
      color: 'bg-brand-pink',
      textColor: 'text-white',
      accent: 'border-brand-pink shadow-[0_0_40px_-10px_rgba(233,30,99,0.3)]',
      icon: <Crown className="w-6 h-6 text-white" />,
      features: [
        'Everything in Extra',
        '4K Blu-ray Movie Library',
        'Unlimited Rentals',
        'Same-Day Delivery (2h)',
        'Exclusive Events',
      ],
      button: 'Go Premium',
    },
  ];

  const handleSubscribe = async (tier: Tier) => {
    setLoadingTier(tier.id);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Please log in or register first');
      router.push('/login?redirect=/plus');
      setLoadingTier(null);
      return;
    }

    try {
      // Mock API call
      setTimeout(() => {
        toast.success(`Subscribed to ${tier.name}! Redirecting...`);
        setLoadingTier(null);
        router.push('/account');
      }, 1500);
    } catch {
      toast.error('Something went wrong');
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg pt-20">
      {/* Hero */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/80 to-transparent" />

        <div className="relative z-10 text-center max-w-4xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
              <span className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse" />
              <span className="text-xs font-bold text-white tracking-widest uppercase">
                The Ultimate Membership
              </span>
            </div>

            <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6 text-white leading-none">
              UNLEASH <br />{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-brand-pink">
                YOUR POTENTIAL.
              </span>
            </h1>

            <p className="text-lg md:text-2xl text-slate-400 mb-10 font-light max-w-xl mx-auto leading-relaxed">
              One subscription. Endless entertainment. Books, Games, and Movies
              delivered to your door.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                className="bg-brand-yellow text-brand-dark hover:bg-white h-14 px-10 text-lg rounded-full font-bold"
                onClick={() =>
                  document
                    .getElementById('tiers')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                View Plans
              </Button>
              <Button
                variant="outline"
                className="h-14 px-10 rounded-full text-white border-white/20 hover:bg-white/10"
              >
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tiers */}
      <section id="tiers" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative flex flex-col p-8 rounded-[2rem] border transition-all duration-300 hover:-translate-y-2
                ${tier.popular ? `bg-brand-surface ${tier.accent} z-10 md:scale-105` : 'bg-white/5 border-white/5 hover:border-white/20'}
              `}
            >
              {tier.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-yellow text-brand-dark text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-brand-yellow/20">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${tier.popular ? 'bg-brand-yellow text-brand-dark' : 'bg-white/10 text-white'}`}
                >
                  {tier.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">
                    {tier.price}
                  </span>
                  <span className="text-sm text-slate-500 font-medium">
                    IQD / mo
                  </span>
                </div>
              </div>

              <ul className="flex-1 space-y-4 mb-8">
                {tier.features.map((feature, f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-sm text-slate-300"
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${tier.popular ? 'bg-brand-yellow/20 text-brand-yellow' : 'bg-white/10 text-slate-500'}`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                isLoading={loadingTier === tier.id}
                onClick={() => handleSubscribe(tier)}
                disabled={loadingTier !== null}
                className={`w-full py-4 h-14 rounded-xl font-bold text-lg transition-all border-none
                  ${
                    tier.popular
                      ? 'bg-brand-yellow text-brand-dark hover:bg-white'
                      : 'bg-white/10 text-white hover:bg-white hover:text-black'
                  }
                `}
              >
                {tier.button}
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 border-t border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              Why Join Plus?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Experience the ultimate convenience. We handle everything so you
              can focus on playing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Gamepad2 size={32} className="text-brand-pink" />}
              title="Huge Library"
              desc="Access thousands of physical games, books, and movies. Swapped instantly."
            />
            <FeatureCard
              icon={<Zap size={32} className="text-brand-yellow" />}
              title="Fast Delivery"
              desc="Our dedicated fleet ensures your order arrives within hours, anywhere in Baghdad."
            />
            <FeatureCard
              icon={<Crown size={32} className="text-blue-500" />}
              title="VIP Access"
              desc="Get invited to exclusive tournaments, launch parties, and community events."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
