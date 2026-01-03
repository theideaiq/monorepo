'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Check, Star, Zap, BookOpen, Gamepad2, Film } from 'lucide-react';

export default function PlusHome() {
  const tiers = [
    {
      name: "IDEA Essential",
      price: "15,000",
      color: "bg-slate-700",
      accent: "text-slate-200",
      icon: <BookOpen className="w-6 h-6" />,
      features: ["Access to 5,000+ Books", "1 Book Rental at a time", "Standard Delivery", "Community Access"],
      button: "Join Essential"
    },
    {
      name: "IDEA Extra",
      price: "25,000",
      color: "bg-brand-yellow",
      accent: "text-brand-dark",
      textColor: "text-brand-dark",
      icon: <Gamepad2 className="w-6 h-6" />,
      features: ["Everything in Essential", "Access to PS5 & Switch Games", "2 Rentals at a time", "Faster Delivery"],
      button: "Join Extra",
      popular: true
    },
    {
      name: "IDEA Premium",
      price: "40,000",
      color: "bg-brand-pink",
      accent: "text-white",
      icon: <Zap className="w-6 h-6" />,
      features: ["Everything in Extra", "4K Blu-ray Movie Library", "3 Rentals at a time", "Same-Day Delivery", "Exclusive Event Access"],
      button: "Join Premium"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f1014] text-white font-sans selection:bg-brand-yellow selection:text-brand-dark">
      

      {/* Hero Section (Cinematic) */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background Gradient/Image Placeholder */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1014] via-[#0f1014]/50 to-transparent"></div>
        
        <div className="relative z-10 text-center max-w-4xl px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block py-1 px-3 rounded border border-brand-yellow text-brand-yellow text-xs font-bold tracking-wider mb-6">
              THE ULTIMATE SUBSCRIPTION
            </span>
            <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-6">
              UNLEASH <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-brand-pink">YOUR PLAY.</span>
            </h1>
            <p className="text-lg md:text-2xl text-slate-300 mb-10 font-light max-w-2xl mx-auto">
              Books, Games, and Movies delivered to your door in Baghdad. 
              One subscription. Endless entertainment.
            </p>
            <button className="bg-brand-yellow text-brand-dark text-lg font-bold px-10 py-4 rounded-full hover:scale-105 transition transform shadow-[0_0_20px_rgba(255,214,0,0.4)]">
              View Plans
            </button>
          </motion.div>
        </div>
      </section>

      {/* The Tiers (PlayStation Style Cards) */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Choose Your Tier</h2>
          <p className="text-slate-400">Cancel anytime. No hidden fees.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative flex flex-col p-8 rounded-3xl ${tier.popular ? 'bg-slate-800 border-2 border-brand-yellow shadow-2xl scale-105 z-10' : 'bg-[#18191d] border border-white/5'} transition-all duration-300 hover:transform hover:-translate-y-2`}
            >
              {tier.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-brand-yellow text-brand-dark text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <div className={`w-12 h-12 rounded-xl ${tier.color} flex items-center justify-center mb-6 text-brand-dark`}>
                  {tier.icon}
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${tier.popular ? 'text-white' : 'text-slate-200'}`}>{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-sm text-slate-500">IQD / month</span>
                </div>
              </div>

              <ul className="flex-1 space-y-4 mb-8">
                {tier.features.map((feature, f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className={`w-5 h-5 ${tier.accent} shrink-0`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button className={`w-full py-4 rounded-xl font-bold transition-all ${tier.popular ? 'bg-brand-yellow text-brand-dark hover:bg-yellow-400' : 'bg-white/10 text-white hover:bg-white hover:text-black'}`}>
                {tier.button}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Catalog Preview (Horizontal Scroll) */}
      <section className="py-24 bg-gradient-to-b from-[#0f1014] to-brand-dark">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">New to the Library</h2>
              <p className="text-slate-400">Just arrived this week.</p>
            </div>
            <a href="#" className="text-brand-pink hover:text-white transition text-sm font-bold flex items-center gap-1">
              View All Catalog <Zap className="w-4 h-4" />
            </a>
          </div>
          
          {/* Placeholder for Movie/Game Covers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-50">
             {[1,2,3,4].map((item) => (
               <div key={item} className="aspect-[2/3] bg-slate-800 rounded-xl animate-pulse"></div>
             ))}
          </div>
        </div>
      </section>

    </div>
  );
}
