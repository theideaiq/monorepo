'use client';

import React from 'react';

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-brand-dark text-center mb-12">Frequently Asked Questions</h1>
        
        <div className="space-y-6">
          <Details summary="How does IDEA Plus rental work?" content="You subscribe to a monthly tier. Browse our catalog, select a book or game, and we deliver it to your door within 24 hours. When you are done, schedule a pickup, and we swap it for your next item." />
          
          <Details summary="Is delivery free?" content="Yes! All IDEA Plus subscriptions include free delivery and pickup within Baghdad. Other provinces may have a small shipping surcharge." />
          
          <Details summary="Can I buy items from the Megastore without a subscription?" content="Absolutely. The Megastore is open to everyone. However, IDEA Plus members get special discounts on purchases." />
          
          <Details summary="How do I access The Academy courses?" content="Once you purchase a course, it is added to your digital library forever. You can watch it on any device at your own pace." />
        </div>

      </div>
    </div>
  );
}

// Simple Accordion Component
function Details({ summary, content }: { summary: string, content: string }) {
  return (
    <details className="group bg-white rounded-2xl border border-slate-200 overflow-hidden open:shadow-md transition-all">
      <summary className="flex items-center justify-between p-6 font-bold text-brand-dark cursor-pointer list-none select-none">
        {summary}
        <span className="transform group-open:rotate-180 transition-transform text-brand-pink">▼</span>
      </summary>
      <div className="px-6 pb-6 text-slate-600 leading-relaxed">
        {content}
      </div>
    </details>
  );
}
