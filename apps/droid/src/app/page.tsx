'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, Zap, Globe, Shield, Gamepad2, Send } from 'lucide-react';

const GAME_PREVIEW_BG = '/game-bg-placeholder.jpg';

export default function DroidLanding() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#facc15] selection:text-black overflow-x-hidden">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center z-10">
        
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#facc15] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#facc15]"></span>
          </span>
          <span className="text-sm font-medium text-gray-300">v3.0 Now Live on Telegram</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
          Your Co-Founder <br /> is an AI.
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
          Strategy, Finance, and Logistics for the Iraqi Market. <br />
          The IDEA Droid runs your business operations while you sleep.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <a 
            href="https://t.me/TheIdeaDroidBot" 
            target="_blank"
            className="group relative px-8 py-4 bg-[#facc15] text-black font-bold rounded-xl text-lg flex items-center justify-center gap-2 hover:bg-[#ffe066] transition-all hover:scale-105"
          >
            <Bot className="w-5 h-5" />
            Launch Droid
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
          <button 
            onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl text-lg hover:bg-white/10 transition-all"
          >
            Watch Demo
          </button>
        </div>
      </section>

      {/* 2. INTERACTIVE DEMO (The "Hook") */}
      <section id="demo" className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/10">
          
          {/* Fake Browser Bar */}
          <div className="bg-[#111] px-4 py-3 border-b border-white/10 flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <div className="mx-auto bg-black/50 px-4 py-1 rounded text-xs text-gray-500 font-mono">
              The IDEA Droid • Gemini 3.0 Flash
            </div>
          </div>

          {/* Chat Simulator */}
          <div className="grid md:grid-cols-[250px_1fr] h-[500px]">
            {/* Sidebar */}
            <div className="border-r border-white/10 bg-[#0f0f0f] p-4 hidden md:block">
              <div className="text-xs font-bold text-gray-500 uppercase mb-4">Capabilities</div>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`w-full text-left px-3 py-2 rounded text-sm mb-2 flex items-center gap-2 transition-colors ${activeTab === 'chat' ? 'bg-[#facc15]/10 text-[#facc15]' : 'text-gray-400 hover:bg-white/5'}`}
              >
                <Bot className="w-4 h-4" /> Business Strategy
              </button>
              <button 
                onClick={() => setActiveTab('game')}
                className={`w-full text-left px-3 py-2 rounded text-sm mb-2 flex items-center gap-2 transition-colors ${activeTab === 'game' ? 'bg-[#facc15]/10 text-[#facc15]' : 'text-gray-400 hover:bg-white/5'}`}
              >
                <Gamepad2 className="w-4 h-4" /> Spark Catcher
              </button>
              <button 
                onClick={() => setActiveTab('finance')}
                className={`w-full text-left px-3 py-2 rounded text-sm mb-2 flex items-center gap-2 transition-colors ${activeTab === 'finance' ? 'bg-[#facc15]/10 text-[#facc15]' : 'text-gray-400 hover:bg-white/5'}`}
              >
                <Zap className="w-4 h-4" /> Finance Ops
              </button>
            </div>

            {/* Main Content Area */}
            <div className="bg-[#050505] relative">
              {activeTab === 'chat' && <ChatSimulation />}
              {activeTab === 'game' && <GamePreview />}
              {activeTab === 'finance' && <FinancePreview />}
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURE GRID */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Globe className="w-8 h-8 text-blue-400" />}
            title="Iraqi Market Context"
            desc="Trained on local laws, Baghdad logistics, and Iraqi consumer behavior. It knows the difference between Karkh and Rusafa."
          />
          <FeatureCard 
            icon={<Shield className="w-8 h-8 text-purple-400" />}
            title="Private & Secure"
            desc="Your business secrets stay safe. Enterprise-grade encryption powered by Telegram and Supabase RLS."
          />
          <FeatureCard 
            icon={<Zap className="w-8 h-8 text-[#facc15]" />}
            title="Instant Execution"
            desc="Don't just chat. The Droid can check stock, calculate VAT, and search The Academy courses in milliseconds."
          />
        </div>
      </section>

      {/* 4. CTA FOOTER */}
      <section className="py-24 text-center px-6 border-t border-white/10 bg-gradient-to-b from-black to-[#111]">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to upgrade your workflow?</h2>
        <p className="text-gray-400 mb-8">Join 500+ Founders in The IDEA Club.</p>
        <a 
            href="https://t.me/TheIdeaDroidBot" 
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#229ED9] hover:bg-[#1e8bbd] text-white font-bold rounded-xl transition-all"
        >
          <Send className="w-5 h-5" />
          Chat on Telegram
        </a>
      </section>
    </div>
  );
}

// --- SUB-COMPONENTS (For Clean Code) ---

function ChatSimulation() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step < 3) setStep(step + 1);
    }, 1500);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div className="p-6 h-full flex flex-col justify-end space-y-4">
      <div className={`flex gap-3 ${step >= 1 ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">👤</div>
        <div className="bg-[#1a1a1a] p-3 rounded-2xl rounded-tl-none text-sm text-gray-200">
          Draft a launch strategy for a coffee roastery in Mansour.
        </div>
      </div>

      <div className={`flex gap-3 flex-row-reverse ${step >= 2 ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
        <div className="w-8 h-8 rounded-full bg-[#facc15] flex items-center justify-center text-black font-bold shrink-0">AI</div>
        <div className="bg-[#facc15]/10 border border-[#facc15]/20 p-3 rounded-2xl rounded-tr-none text-sm text-gray-200 max-w-[80%]">
          <p className="mb-2"><strong className="text-[#facc15]">Strategy Generated:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li><strong>Target Audience:</strong> High-income youth in Mansour/Yarmouk.</li>
            <li><strong>Logistics:</strong> Source beans via Basra port (Duty: 10%).</li>
            <li><strong>Marketing:</strong> Partner with local influencers on Instagram.</li>
          </ul>
        </div>
      </div>
      
      {step === 0 && <div className="text-center text-gray-600 text-sm animate-pulse">Initializing Neural Link...</div>}
    </div>
  );
}

function GamePreview() {
  return (
    <div className={`h-full flex flex-col items-center justify-center bg-[url('${GAME_PREVIEW_BG}')] bg-cover bg-center relative group`}>
      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
        <Gamepad2 className="w-16 h-16 text-[#facc15] mb-4 animate-bounce" />
        <h3 className="text-2xl font-bold mb-2">Spark Catcher ⚡</h3>
        <p className="text-gray-400 mb-6 text-center max-w-xs">Play the exclusive game directly inside Telegram. Compete for high scores and XP.</p>
        <button className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-sm font-bold transition-all">
          Preview Game
        </button>
      </div>
    </div>
  );
}

function FinancePreview() {
  return (
    <div className="h-full p-8 flex items-center justify-center">
      <div className="w-full space-y-3">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Q1 Revenue Projection</span>
          <span className="text-green-400">+12.5%</span>
        </div>
        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 w-[70%] animate-[width_2s_ease-out]" />
        </div>
        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 w-[45%] transition-[width] duration-200 ease-out" />
        </div>
        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-[#facc15] w-[85%] animate-[width_2s_ease-out_1s]" />
        </div>
        <p className="text-xs text-center text-gray-500 mt-8">Real-time financial modeling via /finance command.</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all group">
      <div className="mb-4 p-3 bg-black/50 w-fit rounded-xl group-hover:scale-110 transition-transform duration-300 border border-white/5">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}
