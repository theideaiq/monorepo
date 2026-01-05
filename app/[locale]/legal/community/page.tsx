'use client';

import React from 'react';
import { Heart, Users, ShieldAlert, MessageCircle, ShoppingBag, Truck } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function CommunityGuidelines() {
  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-brand-pink/10 text-brand-pink rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Heart size={32} />
          </div>
          <h1 className="text-4xl font-black text-brand-dark mb-4">Community Guidelines</h1>
          <p className="text-slate-500">Building a safer digital Iraq, together.</p>
        </div>

        <Card className="p-8 md:p-12 space-y-12">
          
          {/* Intro */}
          <section className="space-y-4">
            <p className="leading-relaxed text-slate-600 font-medium">
              Welcome to The IDEA.
            </p>
            <p className="leading-relaxed text-slate-600">
              The IDEA is a community of young people from around Iraq and all walks of life. We are brought together by a commitment to promoting tolerance, eradicating stereotypes, clarity of identity, and catalyzing partnerships to meet global goals.
            </p>
            <p className="leading-relaxed text-slate-600">
              To maintain a thriving community where we can strictly support, listen to, and learn from one another, we ask that you adhere to the following guidelines.
            </p>
          </section>

          {/* I. Golden Rules */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">I</span>
              The Golden Rules (Code of Conduct)
            </h2>
            <div className="pl-11 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-brand-dark mb-2 flex items-center gap-2">
                  <Heart size={16} className="text-brand-pink" /> Treat Others With Respect
                </h3>
                <p className="text-sm text-slate-600">
                  Follow the &quot;Golden Rule&quot;: Treat others as you would like to be treated. We do not tolerate harassment, bullying, or toxicity.
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-brand-dark mb-2 flex items-center gap-2">
                  <MessageCircle size={16} className="text-blue-500" /> Keep It Civil
                </h3>
                <p className="text-sm text-slate-600">
                  We encourage debate, but criticize ideas, not people. Avoid name-calling, ad hominem attacks, and knee-jerk contradictions.
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-brand-dark mb-2 flex items-center gap-2">
                  <Users size={16} className="text-green-500" /> English First
                </h3>
                <p className="text-sm text-slate-600">
                  This is primarily an English-speaking community to facilitate cross-cultural exchange. Please keep conversations in English unless designated otherwise.
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-brand-dark mb-2 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-brand-yellow" /> Add Value
                </h3>
                <p className="text-sm text-slate-600">
                  Before posting, ensure your message adds value. Avoid spamming walls of text, excessive caps, or off-topic content.
                </p>
              </div>
            </div>
          </section>

          {/* II. Prohibited Content */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">II</span>
              Prohibited Content & Behavior
            </h2>
            <div className="pl-11 space-y-6 text-slate-600">
              
              <div>
                <h3 className="font-bold text-brand-dark text-lg mb-2">1. Hate Speech & Discrimination</h3>
                <p>
                  We have a zero-tolerance policy regarding attacks based on race, ethnicity, national origin, religion, disability, disease, age, sexual orientation, gender, or gender identity. Xenophobia and disrespect towards different cultures are not allowed.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-brand-dark text-lg mb-2">2. Harassment & Doxing</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>No Harassment:</strong> You may not abuse, impersonate, or intimidate others.</li>
                  <li><strong>No Doxing:</strong> Publishing personal information (passwords, bank accounts, home addresses) without consent is strictly forbidden.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-brand-dark text-lg mb-2">3. NSFW & Inappropriate Content</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>No Nudity:</strong> Sexually explicit content and &quot;NSFW&quot; media are prohibited, including in profile pictures.</li>
                  <li><strong>Protecting Minors:</strong> Zero-tolerance policy towards harmful content involving minors. We cooperate with law enforcement regarding predatory behavior.</li>
                  <li><strong>Sensitive Topics:</strong> Do not share content glorifying self-harm, suicide, gore, or animal cruelty.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-brand-dark text-lg mb-2">4. Illegal Acts & Spam</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>No Illegal Content:</strong> Promoting terrorism, illegal drug use, or pirated content is banned.</li>
                  <li><strong>No Spam:</strong> Do not spam channels or DM members for self-promotion or commercial purposes.</li>
                </ul>
              </div>

            </div>
          </section>

          {/* III. Moderation */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">III</span>
              Moderation & Enforcement
            </h2>
            <div className="pl-11 text-slate-600 space-y-4">
              <p>We utilize a system of Notices, Warnings, and Bans to manage behavioral issues.</p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold h-fit">NOTICE</span>
                  <span className="text-sm">Logged verbal warnings for things like light spam. Expire after 60 days.</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold h-fit">WARNING</span>
                  <span className="text-sm">For repeated behavior. Accumulating 5 active warnings results in a ban.</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold h-fit">INSTANT BAN</span>
                  <span className="text-sm">Reserved for severe violations (Hate speech, Gore, Doxing, Raiding).</span>
                </li>
              </ul>
              <p className="text-sm italic">
                Please respect Staff decisions. If you feel you have been treated unfairly, contact an Admin privately.
              </p>
            </div>
          </section>

          {/* IV. Programs */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">IV</span>
              Program Participation
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-2">If you participate in cohorts like xDigital:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>No Ghosting:</strong> Do not end contact with your partners or team without explanation.</li>
                <li><strong>Attendance:</strong> Participation in weekly calls is often required.</li>
              </ul>
            </div>
          </section>

          {/* V. Marketplace & Rentals (ADDED SECTION) */}
          <section className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-dark text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">V</span>
              Marketplace & Rental Etiquette
            </h2>
            <div className="pl-11 text-slate-600 space-y-4">
              <p>To keep The IDEA Megastore safe for everyone, we enforce strict trading rules:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-brand-dark flex items-center gap-2 mb-2">
                    <ShoppingBag size={16} /> Honest Listings
                  </h3>
                  <p className="text-sm">
                    Sellers must accurately describe the condition of used items. Hiding defects or using fake photos will result in an immediate ban from the marketplace.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-brand-dark flex items-center gap-2 mb-2">
                    <Truck size={16} /> Rental Respect
                  </h3>
                  <p className="text-sm">
                    Treat rented equipment (PS5s, Cameras) like your own. Returning dirty, damaged, or modified equipment hurts the community and will incur fines.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* VI. Offline Safety (ADDED SECTION) */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">VI</span>
              Offline Interactions
            </h2>
            <div className="pl-11 text-slate-600">
              <p>
                The IDEA extends beyond the screen. When interacting with our Delivery Captains or attending events at The Station:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Respect Staff:</strong> Abuse towards delivery drivers or event staff is a major offense.</li>
                <li><strong>Safe Meetups:</strong> If trading P2P, meet in public, well-lit areas.</li>
              </ul>
            </div>
          </section>

          <section className="pt-8 border-t border-slate-100 text-center text-slate-500 text-sm">
            <p>
              By staying in this community, you agree to follow these guidelines and the platform&apos;s Terms of Service.
              These rules are provided as a courtesy, and Staff reserves the right to deviate from them if necessary to protect the community.
            </p>
          </section>

        </Card>
      </div>
    </div>
  );
}
