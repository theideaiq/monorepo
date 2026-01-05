'use client';

import React from 'react';
import { Building2, Briefcase, TrendingUp, Users, ShoppingCart, GraduationCap, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function SuitePage() {
  return (
    <div className="min-h-screen bg-white pt-20">
      
      {/* 1. B2B HERO SECTION */}
      <section className="bg-brand-dark text-white py-24 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium text-brand-yellow mb-6">
              <Building2 size={16} /> The IDEA Suite
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Powering the <br/>
              <span className="text-brand-pink">Iraqi Economy.</span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 max-w-lg leading-relaxed">
              One platform to handle your procurement, recruitment, and employee training. 
              Simplify your operations with The IDEA Suite.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="h-14 px-8 text-lg">Contact Sales</Button>
              <Button variant="outline" className="h-14 px-8 text-lg border-white text-white hover:bg-white hover:text-brand-dark">
                Download Brochure
              </Button>
            </div>
          </div>
          
          {/* Abstract B2B Graphic */}
          <div className="relative h-[500px] bg-gradient-to-tr from-brand-pink/20 to-brand-yellow/20 rounded-3xl border border-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] opacity-20 bg-cover bg-center mix-blend-overlay rounded-3xl"></div>
            
            {/* Floating Stats Cards */}
            <div className="bg-white text-brand-dark p-6 rounded-xl shadow-xl max-w-xs ml-auto mb-6 transform hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-green-100 text-green-700 rounded-lg"><TrendingUp size={20}/></div>
                <span className="font-bold">Procurement</span>
              </div>
              <p className="text-2xl font-bold">15% Saved</p>
              <p className="text-xs text-slate-500">On bulk electronics orders</p>
            </div>

            <div className="bg-white text-brand-dark p-6 rounded-xl shadow-xl max-w-xs mr-auto transform hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Users size={20}/></div>
                <span className="font-bold">Recruiting</span>
              </div>
              <p className="text-2xl font-bold">3 Days</p>
              <p className="text-xs text-slate-500">Average time to hire</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE THREE PILLARS */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-brand-dark">Complete Corporate Solutions</h2>
            <p className="text-slate-500 mt-4">Everything you need to run a modern business in Baghdad.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: Procurement */}
            <Card className="p-8 border-t-4 border-t-brand-pink hover:shadow-2xl transition-all">
              <div className="w-14 h-14 bg-pink-50 text-brand-pink rounded-2xl flex items-center justify-center mb-6">
                <ShoppingCart size={32} />
              </div>
              <h3 className="text-2xl font-bold text-brand-dark mb-4">Megastore Business</h3>
              <p className="text-slate-600 mb-6 min-h-[80px]">
                Bulk purchasing for electronics, office furniture, and supplies. Get VAT invoices and dedicated account managers.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle size={16} className="text-green-500"/> Wholesale Pricing</li>
                <li className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle size={16} className="text-green-500"/> Scheduled Delivery</li>
                <li className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle size={16} className="text-green-500"/> Net-30 Payment Terms</li>
              </ul>
              <Button className="w-full" variant="outline">Start Procurement</Button>
            </Card>

            {/* Pillar 2: Training */}
            <Card className="p-8 border-t-4 border-t-brand-yellow hover:shadow-2xl transition-all">
              <div className="w-14 h-14 bg-yellow-50 text-brand-dark rounded-2xl flex items-center justify-center mb-6">
                <GraduationCap size={32} />
              </div>
              <h3 className="text-2xl font-bold text-brand-dark mb-4">Academy Teams</h3>
              <p className="text-slate-600 mb-6 min-h-[80px]">
                Upskill your workforce with private cohorts. English language, Coding, and Soft Skills training designed for companies.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle size={16} className="text-green-500"/> Progress Dashboards</li>
                <li className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle size={16} className="text-green-500"/> Certified Instructors</li>
                <li className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle size={16} className="text-green-500"/> Custom Curriculum</li>
              </ul>
              <Button className="w-full" variant="outline">View Corporate Plans</Button>
            </Card>

            {/* Pillar 3: HR */}
            <Card className="p-8 border-t-4 border-t-brand-dark hover:shadow-2xl transition-all">
              <div className="w-14 h-14 bg-slate-100 text-brand-dark rounded-2xl flex items-center justify-center mb-6">
                <Briefcase size={32} />
              </div>
              <h3 className="text-2xl font-bold text-brand-dark mb-4">The Network</h3>
              <p className="text-slate-600 mb-6 min-h-[80px]">
                Access the top 1% of Iraqi talent. Post jobs, manage applicants, and streamline your hiring process.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle size={16} className="text-green-500"/> Verified Profiles</li>
                <li className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle size={16} className="text-green-500"/> AI Matching</li>
                <li className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle size={16} className="text-green-500"/> Background Checks</li>
              </ul>
              <Button className="w-full" variant="outline">Post a Job</Button>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. TRUST BANNER */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Trusted by innovative companies in Iraq</p>
          <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale">
            {/* Fake Logos for layout - Replace with real ones later */}
            <div className="text-2xl font-black text-slate-800">ZAIN</div>
            <div className="text-2xl font-black text-slate-800">ASIACELL</div>
            <div className="text-2xl font-black text-slate-800">TOTERS</div>
            <div className="text-2xl font-black text-slate-800">KAREEM</div>
            <div className="text-2xl font-black text-slate-800">TALABAT</div>
          </div>
        </div>
      </section>

      {/* 4. LEAD GEN SECTION */}
      <section className="bg-brand-yellow py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-brand-dark mb-6">Ready to upgrade your business?</h2>
          <p className="text-xl text-brand-dark/80 mb-8">
            Speak to a B2B specialist today and get a custom quote for your organization.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
             <Button variant="dark" className="h-14 px-8 text-lg">Contact Our Sales Team</Button>
             <Button variant="outline" className="h-14 px-8 text-lg bg-white border-white hover:bg-white/90">View Pricing</Button>
          </div>
        </div>
      </section>

    </div>
  );
}
