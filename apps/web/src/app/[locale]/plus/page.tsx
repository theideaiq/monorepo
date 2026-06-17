'use client';

import { Button } from '@repo/ui';
import { motion } from 'framer-motion';
import { Check, Crown, Gamepad2, Zap } from 'lucide-react';
import Image from 'next/image';

export default function PlusPage() {
  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 overflow-hidden">
      {/* Hero Section */}
      <section className="container mx-auto px-4 text-center mb-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block p-4 rounded-full bg-brand-yellow/10 mb-8"
        >
          <Crown className="w-12 h-12 text-brand-yellow" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-8xl font-black mb-6 tracking-tight"
        >
          THE IDEA<span className="text-brand-yellow">+</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-12"
        >
          Premium access to exclusive digital experiences, early drops, and
          members-only events in Baghdad.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            size="lg"
            className="h-16 px-12 text-lg font-bold rounded-2xl bg-brand-yellow text-black hover:bg-white transition-colors"
          >
            Join the Waitlist
          </Button>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Zap />}
            title="Early Access"
            description="Get 24h early access to all new product drops and limited editions."
            delay={0.4}
          />
          <FeatureCard
            icon={<Gamepad2 />}
            title="VIP Events"
            description="Invitations to exclusive gaming tournaments and tech showcases."
            delay={0.5}
          />
          <FeatureCard
            icon={<Check />}
            title="Free Shipping"
            description="Zero delivery fees on all orders across Iraq, forever."
            delay={0.6}
          />
        </div>
      </section>

      {/* Background Decor */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-yellow/5 rounded-full blur-[120px] pointer-events-none -z-10" />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/5 hover:border-brand-yellow/30 transition-colors"
    >
      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-brand-yellow mb-6">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}
