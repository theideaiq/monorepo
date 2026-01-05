'use client';

import React from 'react';
import { Target, Lightbulb } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white pt-20">
      
      {/* Hero Section */}
      <section className="bg-brand-dark text-white py-24 px-4 text-center rounded-b-[3rem] relative overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto">
          <span className="text-brand-yellow font-bold tracking-wider text-sm uppercase mb-4 block">Our Story</span>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Building the Digital Future of <span className="text-brand-pink">Baghdad</span>.
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
            The IDEA IQ is not just a company. It is an ecosystem designed to bridge the gap between commerce, education, and entertainment for the modern Iraqi citizen.
          </p>
        </div>
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-pink/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-yellow/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
      </section>

      {/* Mission & Vision Grid */}
      <section className="max-w-7xl mx-auto px-4 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
             <div className="flex gap-4">
                <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-brand-pink shrink-0">
                  <Target size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brand-dark">Our Mission</h3>
                  <p className="text-slate-600 mt-2">To provide a unified digital identity for every Iraqi, allowing seamless access to premium products, world-class education, and entertainment.</p>
                </div>
             </div>
             <div className="flex gap-4">
                <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center text-brand-dark shrink-0">
                  <Lightbulb size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brand-dark">Our Vision</h3>
                  <p className="text-slate-600 mt-2">A future where &quot;The IDEA&quot; is the standard for trust, quality, and innovation in the Middle East.</p>
                </div>
             </div>
          </div>
          
          {/* Image Placeholder */}
          <div className="relative h-96 rounded-3xl overflow-hidden shadow-2xl bg-slate-100">
             {/* Replace with a real photo of Baghdad or Team later */}
             <div className="absolute inset-0 bg-gradient-to-tr from-brand-pink to-brand-yellow opacity-10"></div>
             <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium">
               [Team Photo / Baghdad Skyline]
             </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-50 py-20 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Active Users", value: "10k+" },
            { label: "Products", value: "5,000+" },
            { label: "Courses", value: "120+" },
            { label: "Cities", value: "18" }
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-4xl font-bold text-brand-dark mb-2">{stat.value}</div>
              <div className="text-sm text-slate-500 uppercase tracking-wide font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
