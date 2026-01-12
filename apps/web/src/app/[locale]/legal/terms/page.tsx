'use client';

import { AlertTriangle, Gavel, Globe, Scale } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-brand-pink/10 text-brand-pink rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Scale size={32} />
          </div>
          <h1 className="text-4xl font-black text-brand-dark mb-4">
            Terms of Service
          </h1>
          <p className="text-slate-500">Last Updated: January 3, 2026</p>
        </div>

        <Card className="p-8 md:p-12 space-y-12">
          {/* 1. Introduction */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">
                1
              </span>
              Introduction
            </h2>
            <div className="pl-11 text-slate-600 space-y-4">
              <p>
                Welcome to The IDEA. These Terms of Service (“Terms”,
                “Agreement”) constitute a legally binding agreement made between
                you, whether personally or on behalf of an entity (“You”,
                “User”), and The IDEA (“Company”, “We”, “Us”, or “Our”), located
                at
                <strong> Al-Sinaha St, Eastern Karradah, Baghdad, Iraq</strong>.
              </p>
              <p>
                By accessing or using our website, mobile application, or
                services (collectively, the &quot;Service&quot;), you agree that
                you have read, understood, and agreed to be bound by these
                Terms.
              </p>
              <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-lg text-sm font-bold">
                IF YOU DO NOT AGREE WITH ALL OF THESE TERMS, THEN YOU ARE
                EXPRESSLY PROHIBITED FROM USING THE SERVICE AND YOU MUST
                DISCONTINUE USE IMMEDIATELY.
              </div>
            </div>
          </section>

          {/* 2. Eligibility */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">
                2
              </span>
              Eligibility
            </h2>
            <div className="pl-11 text-slate-600">
              <p>
                The Service is intended for users who are at least 13 years old.
                Persons under the age of 13 are not permitted to use or register
                for the Service. If you are a minor in your jurisdiction
                (generally under 18), you must have the permission of, and be
                directly supervised by, your parent or guardian to use the
                Service.
              </p>
            </div>
          </section>

          {/* 3. User Accounts */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">
                3
              </span>
              User Accounts
            </h2>
            <div className="pl-11 text-slate-600 space-y-2">
              <p>
                To access certain features (Rentals, B2B Suite), you may be
                required to register. You agree to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Provide true, accurate, current, and complete information.
                </li>
                <li>
                  Keep your password confidential and accept responsibility for
                  all account activity.
                </li>
                <li>
                  <strong>Identity Verification:</strong> For rental access, you
                  agree to provide valid Government ID (National ID or Passport)
                  if requested for fraud prevention.
                </li>
              </ul>
              <p className="text-sm italic mt-2">
                We reserve the right to remove or reclaim usernames if we
                determine they are inappropriate or infringe on trademarks.
              </p>
            </div>
          </section>

          {/* 4. Intellectual Property */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">
                4
              </span>
              Intellectual Property Rights
            </h2>
            <div className="pl-11 text-slate-600">
              <p>
                Unless otherwise indicated, the Service is our proprietary
                property. All source code, databases, software, website designs,
                audio, video, text, and graphics (the &ldquo;Content&rdquo;) and
                the trademarks (the &ldquo;Marks&rdquo;) are owned or controlled
                by us or licensed to us, and are protected by copyright and
                trademark laws.
              </p>
            </div>
          </section>

          {/* 5. Payments & Billing */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">
                5
              </span>
              Payments & Billing
            </h2>
            <div className="pl-11 text-slate-600">
              <p>
                Payments are processed via our partners{' '}
                <strong>Wayl, ZainCash, and FIB</strong>. By making a purchase
                or rental, you agree to:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  Pay all charges at the prices then in effect for your
                  purchases.
                </li>
                <li>
                  Authorize us to charge your chosen payment provider for these
                  amounts.
                </li>
                <li>
                  <strong>Refunds:</strong> Refunds are processed in accordance
                  with our Refund Policy and Iraqi Consumer Law.
                </li>
              </ul>
            </div>
          </section>

          {/* 6. User Prohibited Activities */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">
                6
              </span>
              Prohibited Activities
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-2">You agree not to:</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <li className="flex gap-2">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />{' '}
                  Trick, defraud, or mislead us or other users.
                </li>
                <li className="flex gap-2">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />{' '}
                  Circumvent security features.
                </li>
                <li className="flex gap-2">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />{' '}
                  Use the Service to compete with us.
                </li>
                <li className="flex gap-2">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />{' '}
                  Engage in automated data mining or bots.
                </li>
              </ul>
            </div>
          </section>

          {/* 7. RENTAL AGREEMENT (CRITICAL) */}
          <section className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-dark text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                7
              </span>
              Rental Agreement & Liability
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-4">
                When you rent equipment (e.g., PS5, Cameras, Books) from IDEA
                Plus, you agree to the following strict terms:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Care of Goods:</strong> You must return items in the
                  exact condition they were received, normal wear and tear
                  excepted.
                </li>
                <li>
                  <strong>Liability:</strong> You are 100% financially liable
                  for the full replacement cost of any item that is lost,
                  stolen, or damaged while in your possession.
                </li>
                <li>
                  <strong>Late Fees:</strong> Items not returned by the due date
                  will incur a daily late fee equivalent to the daily rental
                  rate.
                </li>
                <li>
                  <strong>Non-Return:</strong> Failure to return an item within
                  7 days of the due date will be considered theft and reported
                  to Iraqi authorities.
                </li>
              </ul>
            </div>
          </section>

          {/* 8. Marketplace Disclaimer */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">
                8
              </span>
              Megastore Marketplace
            </h2>
            <div className="pl-11 text-slate-600">
              <p>
                The Megastore may include products sold by third-party sellers.
                While we verify sellers, The IDEA acts as a venue. We are not
                responsible for the quality, safety, or legality of items
                advertised by third parties, except where &quot;Verified by
                IDEA&quot; is explicitly stated.
              </p>
            </div>
          </section>

          {/* 9. Pioneer Program */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">
                9
              </span>
              The IDEA Pioneer Program
            </h2>
            <div className="pl-11 text-slate-600 text-sm">
              <p>If you join our Affiliate Program:</p>
              <ul className="list-disc pl-5 mt-2">
                <li>You are an independent contractor, not an employee.</li>
                <li>Commissions are paid only on valid, completed sales.</li>
                <li>
                  We may terminate your participation at any time for fraudulent
                  or aggressive marketing.
                </li>
              </ul>
            </div>
          </section>

          {/* 10. Disclaimers & Liability */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">
                10
              </span>
              Limitation of Liability
            </h2>
            <div className="pl-11 text-slate-600 uppercase text-sm font-bold tracking-wide">
              <p className="mb-4">
                THE SERVICE IS PROVIDED &quot;AS-IS&quot;. TO THE FULLEST EXTENT
                PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES.
              </p>
              <p>
                IN NO EVENT WILL THE IDEA BE LIABLE FOR ANY DIRECT, INDIRECT,
                CONSEQUENTIAL, OR INCIDENTAL DAMAGES ARISING FROM YOUR USE OF
                THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF
                SUCH DAMAGES.
              </p>
            </div>
          </section>

          {/* 12. Governing Law */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">
                11
              </span>
              Governing Law (Iraq)
            </h2>
            <div className="pl-11 text-slate-600">
              <p>
                These Terms shall be governed by and defined following the laws
                of the Republic of Iraq, specifically adhering to:
              </p>
              <ul className="list-disc pl-5 mt-2 mb-2">
                <li>
                  <strong>Civil Code No. 40 of 1951</strong>
                </li>
                <li>
                  <strong>
                    Electronic Signature and Electronic Transactions Law No. 78
                    of 2012
                  </strong>
                </li>
              </ul>
              <p>
                Any dispute arising out of or in connection with this Agreement
                shall be subject to the exclusive jurisdiction of the{' '}
                <strong>Courts of Baghdad, Iraq</strong>.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="pt-8 border-t border-slate-100">
            <h2 className="text-xl font-bold text-brand-dark mb-4">
              Contact Us
            </h2>
            <p className="text-slate-600 mb-4">
              To resolve a complaint regarding the Service, please contact us
              at:
            </p>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex items-center gap-3 text-slate-700">
                <Gavel size={20} className="text-brand-pink" />
                <span>legal@theideaiq.com</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Globe size={20} className="text-brand-yellow" />
                <span>Al-Sinaha St, Eastern Karradah, Baghdad</span>
              </div>
            </div>
          </section>
        </Card>
      </div>
    </div>
  );
}
