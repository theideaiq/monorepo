'use client';

import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-brand-dark mb-4">Get in Touch</h1>
          <p className="text-slate-500">We are here to help. Chat with us or send a message.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Email */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
            <Mail className="w-8 h-8 text-brand-pink mx-auto mb-4" />
            <h3 className="font-bold text-brand-dark">Email Us</h3>
            <a href="mailto:hello@theideaiq.com" className="text-brand-pink font-medium hover:underline">hello@theideaiq.com</a>
          </div>

          {/* Phone */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
            <Phone className="w-8 h-8 text-brand-yellow mx-auto mb-4" />
            <h3 className="font-bold text-brand-dark">Call Us</h3>
            <a href="tel:+9647700000000" className="text-brand-dark font-medium hover:underline">+964 770 000 0000</a>
          </div>

          {/* Visit */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
            <MapPin className="w-8 h-8 text-slate-700 mx-auto mb-4" />
            <h3 className="font-bold text-brand-dark">Visit Us</h3>
            <p className="text-sm text-slate-500">Al-Mansour District, Baghdad</p>
          </div>

        </div>
      </div>
    </div>
  );
}
