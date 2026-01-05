'use client';

import React from 'react';
import { RefreshCw, RotateCcw, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-brand-pink/10 text-brand-pink rounded-2xl flex items-center justify-center mx-auto mb-6">
            <RefreshCw size={32} />
          </div>
          <h1 className="text-4xl font-black text-brand-dark mb-4">Refund & Cancellation Policy</h1>
          <p className="text-slate-500">Last Updated: January 3, 2026</p>
        </div>

        <Card className="p-8 md:p-12 space-y-12">
          
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-slate-600 text-sm">
            <p>
              Thank you for choosing The IDEA. We invite you to read our policy on refunds, returns, and cancellations. 
              This policy applies to all services and products purchased through The IDEA.
            </p>
          </div>

          {/* 1. Physical Goods */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Physical Goods (Megastore)
            </h2>
            <div className="pl-11 text-slate-600 space-y-4">
              <p>This section applies to physical items shipped to you (e.g., merchandise, books, equipment).</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-bold text-brand-dark mb-2">30-Day Return Window</h3>
                  <p className="text-sm">You have 30 days after receiving your item to request a return.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-bold text-brand-dark mb-2">Eligibility</h3>
                  <p className="text-sm">Item must be in the same condition you received it, unworn/unused, with tags, and in original packaging.</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-brand-dark mb-2">How to Start a Return</h3>
                <p className="text-sm mb-2">Contact us at <a href="mailto:returns@theideaiq.com" className="text-brand-pink underline">returns@theideaiq.com</a>.</p>
                <p className="text-sm">
                  If accepted, we&apos;ll send you a return shipping label. Items sent back without requesting a return will not be accepted.
                  <br /><br />
                  <strong>Return Address:</strong><br />
                  The IDEA<br />
                  Al-Sinaha St, Eastern Karradah<br />
                  Baghdad, Iraq IRQ 10066
                </p>
              </div>

              <div>
                <h3 className="font-bold text-brand-dark mb-2">Non-Returnable Items</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Perishable goods (food, flowers).</li>
                  <li>Custom products (personalized items).</li>
                  <li>Personal care goods (beauty products).</li>
                  <li>Hazardous materials.</li>
                  <li><strong>Sale Items & Gift Cards.</strong></li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm">
                <strong>European Union Residents:</strong> You have the right to cancel or return your order within 14 days, for any reason and without a justification.
              </div>
            </div>
          </section>

          {/* 2. Rentals (ADDED SECTION) */}
          <section className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-dark text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Rental Cancellations
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-4">This section applies to rented equipment (PS5, Cameras, etc.) via IDEA Plus.</p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <AlertCircle className="text-brand-yellow shrink-0" size={20} />
                  <div>
                    <strong>Before Delivery:</strong> You may cancel a rental order for a full refund up to 4 hours before the scheduled delivery window.
                  </div>
                </li>
                <li className="flex gap-3">
                  <RotateCcw className="text-brand-pink shrink-0" size={20} />
                  <div>
                    <strong>Early Returns:</strong> If you return an item earlier than your rental period, we do not offer pro-rated refunds for the unused days.
                  </div>
                </li>
              </ul>
            </div>
          </section>

          {/* 3. Subscriptions (ADDED SECTION) */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Subscriptions (IDEA Plus)
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-2">For recurring memberships (Essential, Extra, Premium):</p>
              <ul className="list-disc pl-5 text-sm space-y-2">
                <li><strong>Cancel Anytime:</strong> You can cancel your subscription at any time via your Account Dashboard.</li>
                <li><strong>Billing Cycle:</strong> After cancellation, your access will continue until the end of your current billing period. We do not offer refunds for partial months.</li>
              </ul>
            </div>
          </section>

          {/* 4. Digital Products */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
              Digital Products & Software
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-4">Generally, we do not offer refunds on digital goods once accessed/downloaded.</p>
              <ul className="space-y-2 text-sm">
                <li><strong>Defects:</strong> If a file is corrupted, contact <a href="mailto:hi@theideaiq.com" className="text-brand-pink underline">hi@theideaiq.com</a> for a replacement.</li>
                <li><strong>Non-Delivery:</strong> If you don&apos;t receive your access link, contact us within 7 days.</li>
              </ul>
            </div>
          </section>

          {/* 5. Exchange Programs */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
              Exchange Programs (The Academy)
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-2">Refunds are governed by your specific Program Agreement.</p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li><strong>Application Fees:</strong> Non-refundable.</li>
                <li><strong>Program Fees:</strong> Partially refundable based on cancellation date (see your contract).</li>
                <li><strong>Cancellations by Us:</strong> If we cancel a program, you receive a full refund.</li>
              </ul>
            </div>
          </section>

          {/* Contact */}
          <section className="pt-8 border-t border-slate-100">
            <h2 className="text-xl font-bold text-brand-dark mb-4">Contact Us</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <RotateCcw size={20} className="text-brand-pink" />
                <div>
                  <p className="font-bold text-brand-dark">Return Requests</p>
                  <a href="mailto:returns@theideaiq.com" className="text-sm text-slate-500 hover:text-brand-pink">returns@theideaiq.com</a>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <AlertCircle size={20} className="text-brand-yellow" />
                <div>
                  <p className="font-bold text-brand-dark">General Questions</p>
                  <a href="mailto:hi@theideaiq.com" className="text-sm text-slate-500 hover:text-brand-pink">hi@theideaiq.com</a>
                </div>
              </div>
            </div>
          </section>

        </Card>
      </div>
    </div>
  );
}
