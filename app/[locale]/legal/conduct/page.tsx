'use client';

import React from 'react';
import { Heart, Users, AlertTriangle, Accessibility, Beer, GraduationCap, Truck } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function CodeOfConduct() {
  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-brand-pink/10 text-brand-pink rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Heart size={32} />
          </div>
          <h1 className="text-4xl font-black text-brand-dark mb-4">Code of Conduct</h1>
          <p className="text-slate-500">Last Updated: January 3, 2026</p>
        </div>

        <Card className="p-8 md:p-12 space-y-12">
          
          {/* 1. Our Pledge */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Our Pledge
            </h2>
            <div className="pl-11 text-slate-600">
              <p>
                At The IDEA, we believe in inclusivity, kindness, and a positive community for all. We pledge to make participation in our programs a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, language, nationality, race, religion (or lack thereof), sexual orientation, or socioeconomic status.
              </p>
            </div>
          </section>

          {/* 2. Scope */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Scope
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-2">This Code of Conduct applies to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>All online spaces managed by The IDEA (Apps, Discord, Social Media).</li>
                <li>All in-person events, workshops, and exchange programs.</li>
                <li>All participants, including employees, volunteers, partners, sponsors, and guest speakers.</li>
              </ul>
            </div>
          </section>

          {/* 3. Behavioral Standards */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Behavioral Standards
            </h2>
            <div className="pl-11 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Expected */}
              <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                  <Users size={18} /> Expected Behavior
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-sm text-green-900">
                  <li><strong>Be Inclusive:</strong> Use welcoming and inclusive language.</li>
                  <li><strong>Be Respectful:</strong> Respect differing viewpoints and experiences. Gracefully accept constructive criticism.</li>
                  <li><strong>Be Empathetic:</strong> Display empathy towards other community members.</li>
                  <li><strong>Respect Boundaries:</strong> Refer to people by their preferred pronouns and respect personal space (physical and digital).</li>
                </ul>
              </div>

              {/* Unacceptable */}
              <div className="bg-red-50 p-5 rounded-xl border border-red-100">
                <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                  <AlertTriangle size={18} /> Unacceptable Behavior
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-sm text-red-900">
                  <li><strong>Harassment:</strong> Public or private harassment, deliberate intimidation, stalking, or following.</li>
                  <li><strong>Sexual Misconduct:</strong> Unwelcome sexual attention or sexualized language/imagery.</li>
                  <li><strong>Violence & Threats:</strong> Inflammatory rhetoric or threats.</li>
                  <li><strong>Doxing:</strong> Publishing private info without permission.</li>
                  <li><strong>Discrimination:</strong> Promoting inequality.</li>
                </ul>
              </div>

            </div>
          </section>

          {/* 4. Reporting Violations */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
              Reporting Violations
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-4">
                If you are being harassed, notice that someone else is being harassed, or have any other concerns, please contact The IDEA staff immediately.
              </p>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-brand-dark w-32">General:</span>
                  <a href="mailto:abuse@theideaiq.com" className="text-brand-pink hover:underline">abuse@theideaiq.com</a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-brand-dark w-32">Direct (CEO):</span>
                  <span>Shaheen Farjo (+964 771 170 5222)</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  * All reports will be reviewed and investigated seriously and treated with strict confidentiality.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Enforcement */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
              Enforcement
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-2">The IDEA reserves the right to take any action deemed necessary to correct the behavior, including:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Issuing verbal or written warnings.</li>
                <li>Removing the participant from the program or event (without refund).</li>
                <li>Suspending or terminating access to online communities.</li>
                <li>Reporting the incident to local law enforcement.</li>
              </ul>
            </div>
          </section>

          {/* 6. Accessibility */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span>
              Accessibility (In-Person)
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-2 flex items-center gap-2"><Accessibility size={18} className="text-brand-pink"/> We strive to make our venues welcome to all.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Captions:</strong> Most presentations can be live-captioned upon request (please provide 1 week&apos;s notice).</li>
                <li><strong>Mobility:</strong> If a venue is not wheelchair-accessible, please notify the organizers in advance.</li>
                <li><strong>Photography:</strong> Please let the organizers know if you do not wish to have your picture taken.</li>
              </ul>
            </div>
          </section>

          {/* 7. Alcohol & Drugs */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-yellow/20 text-brand-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">7</span>
              Alcohol & Drugs
            </h2>
            <div className="pl-11 text-slate-600">
              <div className="flex items-center gap-2 mb-2">
                 <Beer size={18} className="text-brand-yellow" /> 
                 <strong>Zero Tolerance Policy</strong>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Alcohol:</strong> Alcohol is generally not served at The IDEA programs.</li>
                <li><strong>Drugs:</strong> The promotion or use of illegal drugs is strictly prohibited at all events and will result in immediate removal.</li>
              </ul>
            </div>
          </section>

          {/* 8. ACADEMIC INTEGRITY (ADDED SECTION) */}
          <section className="space-y-4 border-t border-slate-100 pt-8">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-dark text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">8</span>
              Academic Integrity (The Academy)
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-2 flex items-center gap-2"><GraduationCap size={18} className="text-blue-500"/> For students in our courses:</p>
              <p>
                We value honesty above all. Plagiarism, cheating on assessments, or claiming others&apos; work as your own in The Academy will result in immediate expulsion from the cohort without refund. Certification is earned, not bought.
              </p>
            </div>
          </section>

          {/* 9. STAFF SAFETY (ADDED SECTION) */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
              <span className="bg-brand-dark text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">9</span>
              Staff & Driver Safety
            </h2>
            <div className="pl-11 text-slate-600">
              <p className="mb-2 flex items-center gap-2"><Truck size={18} className="text-brand-pink"/> For Rental & Store Customers:</p>
              <p>
                Our Delivery Captains and Support Staff work hard to serve you. Aggression, threats, or harassment directed at them via chat, phone, or in-person delivery will result in an immediate permanent ban and potential legal action.
              </p>
            </div>
          </section>

          <section className="pt-8 border-t border-slate-100 text-center text-slate-400 text-sm italic">
            <p>
              Permission and consent can be revoked at any given time. Once it has been revoked, it is no longer acceptable to continue a certain act, conversation, or interaction.
            </p>
          </section>

        </Card>
      </div>
    </div>
  );
}
