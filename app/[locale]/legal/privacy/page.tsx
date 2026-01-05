'use client';

import React from 'react';
import { Shield, Globe } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-brand-pink/10 text-brand-pink rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield size={32} />
          </div>
          <h1 className="text-4xl font-black text-brand-dark mb-4">Privacy Policy</h1>
          <p className="text-slate-500">Last Updated: January 3, 2026</p>
        </div>

        <Card className="p-8 md:p-12 space-y-12">
          
          {/* Introduction */}
          <section className="space-y-4">
            <p className="leading-relaxed text-slate-600">
              We understand that online privacy is important to our users (&quot;You&quot; and &quot;Your&quot;), especially when conducting business.
              This statement governs our privacy policies (&quot;Privacy Policy&quot;) concerning those users (&quot;Visitors&quot;) who visit without
              transacting business and users (&quot;Authorized Customers&quot;) who register to transact business and make use of the various
              services (&quot;Service&quot;), operationally offered by The IDEA (&quot;Company&quot;, &quot;Ourselves&quot;, &quot;We&quot;, &quot;Our&quot;, and &quot;Us&quot;).
            </p>
            <p className="leading-relaxed text-slate-600">
              This page applies to information collected through both our online and offline funnels. It informs you of our policies 
              regarding the collection, use, and disclosure of personal information and data we receive from users of our Service.
            </p>
          </section>

          {/* 1. Types of Data */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Types of Data Collected
            </h2>
            
            <div className="pl-11 space-y-6">
              <div>
                <h3 className="font-bold text-lg mb-2">Personal Data</h3>
                <p className="text-slate-600 mb-2">
                  Personal Data refers to any information that identifies or can be used to identify, contact, or locate the person to whom such information pertains, including, but not limited to:
                </p>
                <ul className="list-disc pl-5 text-slate-600 space-y-1">
                  <li>Name, address, phone number, and email address.</li>
                  <li><strong>Identity Verification:</strong> For high-value rentals (e.g., PS5 consoles), we may request a copy of your National ID or Passport.</li>
                  <li><strong>Delivery Coordinates:</strong> Exact location data shared with our logistics partners for order fulfillment.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">Payment Information</h3>
                <p className="text-slate-600">
                  We do not store your sensitive financial information (such as raw credit card numbers) on our servers. All financial transactions are processed by secure, third-party payment providers including <strong>Wayl, ZainCash, FIB (First Iraqi Bank), and Stripe</strong> in compliance with PCI-DSS standards.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">Usage (Log) Data</h3>
                <p className="text-slate-600">
                  We collect information your browser sends whenever you visit our Service. This Usage Data may include your computer’s Internet Protocol address (IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, and other statistics.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Tracking and Cookies */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Tracking and Cookies
            </h2>
            <div className="pl-11 text-slate-600 space-y-4">
              <p>
                We use cookies and similar tracking technologies to track the activity on our Service and hold certain information.
                Examples of Cookies we use:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Session Cookies:</strong> To operate our Service (e.g., keeping you logged in).</li>
                <li><strong>Preference Cookies:</strong> To remember your settings (e.g., language preference).</li>
                <li><strong>Security Cookies:</strong> For security purposes.</li>
              </ul>
              <p>
                <strong>Third-Party Analytics:</strong> We may use third-party Service Providers (such as Google Analytics) to monitor and analyze the use of our Service.
              </p>
            </div>
          </section>

          {/* 3. Use of Data */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Use of Data
            </h2>
            <div className="pl-11">
              <p className="text-slate-600 mb-4">The IDEA uses the collected data for various purposes:</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Provision and maintenance of the Service",
                  "Processing Rental & Store Orders",
                  "Notification of changes to the Service",
                  "Provision of customer care and support",
                  "Analysis of data to improve the Service",
                  "Monitoring the usage of the Service",
                  "Detection, prevention, and addressing of technical issues",
                  "Fulfillment of obligations under Iraqi Consumer Protection Law No. 1 of 2010"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-600 text-sm">
                    <div className="min-w-[6px] h-[6px] rounded-full bg-brand-pink mt-1.5"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 4. Data Retention */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
              Data Retention
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-4">
                We will retain your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. 
                We will retain and use your Data to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our legal agreements.
              </p>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-sm">
                  <strong>User Profiles:</strong> For users that register on our website, we store the personal information they provide in their user profile. 
                  All users can see, edit, or delete their personal information at any time (except they cannot change their username).
                </p>
              </div>
            </div>
          </section>

          {/* 5. Transfer of Data */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
              Transfer of Data
            </h2>
            <div className="pl-11 text-slate-600">
              <p>
                Your information may be transferred to — and maintained on — computers located outside of your state, province, country, 
                or other governmental jurisdiction where the data protection laws may differ. 
              </p>
              <p className="mt-2">
                If you are located outside of Iraq and choose to provide information to us, please note that we transfer the data to 
                <strong> Iraq (and secure servers in Frankfurt, Germany via Supabase)</strong> and process it there. 
                By submitting your information, you agree to this transfer.
              </p>
            </div>
          </section>

          {/* 6. Disclosure of Data */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span>
              Disclosure of Data
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-2">The IDEA may disclose your Personal Data in the good faith belief that such action is necessary to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Comply with a legal obligation (e.g., Iraqi Law enforcement request).</li>
                <li>Protect and defend the rights or property of The IDEA.</li>
                <li>Prevent or investigate possible wrongdoings in connection with the Service (e.g., Rental Theft).</li>
                <li>Protect the personal safety of users of the Service or the public.</li>
              </ul>
            </div>
          </section>

          {/* 7. Governing Law */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">7</span>
              Governing Law (Iraq)
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-4">
                This Privacy Policy and any disputes related to it shall be governed by and construed in accordance with the laws of the Republic of Iraq, specifically:
              </p>
              <ul className="list-disc pl-5 mb-4 space-y-1">
                <li>Consumer Protection Law No. 1 of 2010</li>
                <li>Electronic Signature and Electronic Transactions Law No. 78 of 2012</li>
              </ul>
              <p>
                You agree that any legal action or proceeding between The IDEA and you for any purpose concerning this Privacy Policy shall be brought exclusively in a court of competent jurisdiction sitting in <strong>Baghdad, Iraq</strong>.
              </p>
            </div>
          </section>

          {/* 8. GDPR & CCPA (International) */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">8</span>
              International Rights (GDPR & CCPA)
            </h2>
            <div className="pl-11 text-slate-600 space-y-6">
              
              <div>
                <h3 className="font-bold text-lg mb-2">GDPR (For European Union Users)</h3>
                <p className="mb-2">If you are a resident of the European Economic Area (EEA), you have certain data protection rights:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>The right to access, update, or delete the information we have on you.</li>
                  <li>The right of rectification (correcting wrong info).</li>
                  <li>The right to object or restrict processing.</li>
                  <li>The right to data portability.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">California Consumer Privacy Rights (CCPA)</h3>
                <p className="mb-2">If you are a California resident, you have specific rights:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li><strong>Right to Know:</strong> You can request that we disclose what data we collect.</li>
                  <li><strong>Right to Delete:</strong> You can request that we delete your data.</li>
                  <li><strong>Right to Opt-Out:</strong> The IDEA does <strong>not</strong> sell your personal information.</li>
                </ul>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                To exercise any of these rights, please contact us at <a href="mailto:privacy@theideaiq.com" className="font-bold underline">privacy@theideaiq.com</a>.
              </div>
            </div>
          </section>

          {/* 10. Children's Privacy */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">9</span>
              Children’s Privacy
            </h2>
            <div className="pl-11 text-slate-600">
              <p>
                Our Service does not address anyone under the age of 13 (&quot;Children&quot;). We do not knowingly collect personally identifiable information from anyone under the age of 13. If we become aware that we have collected Personal Data from children without verification of parental consent, we take steps to remove that information from our servers.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="pt-8 border-t border-slate-100">
            <h2 className="text-xl font-bold text-brand-dark mb-4">Contact Us</h2>
            <p className="text-slate-600 mb-4">If you have any questions about this Privacy Policy, please contact us:</p>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex items-center gap-3 text-slate-700">
                <Globe size={20} className="text-brand-pink" />
                <span>privacy@theideaiq.com</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Shield size={20} className="text-brand-yellow" />
                <span>Eastern Karradah, Baghdad, Iraq</span>
              </div>
            </div>
          </section>

        </Card>
      </div>
    </div>
  );
}
