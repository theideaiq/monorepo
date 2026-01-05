'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  Search, Globe, Users,
  ArrowRight, Star, Clock, Award, Plane, Landmark 
} from 'lucide-react';
import { motion } from 'framer-motion';

// UI Kit
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

// --- MOCK DATA ---
const COURSES = [
  {
    id: 1,
    title: "Full-Stack Web Development",
    instructor: "Ahmed Al-Baghdadi",
    org: "University of Baghdad",
    rating: 4.8,
    students: "1.2k",
    level: "Beginner",
    image: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=1000&auto=format&fit=crop",
    category: "Technology"
  },
  {
    id: 2,
    title: "Digital Marketing Masterclass",
    instructor: "Sarah Kareem",
    org: "Zain Iraq",
    rating: 4.9,
    students: "850",
    level: "Intermediate",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000&auto=format&fit=crop",
    category: "Business"
  },
  {
    id: 3,
    title: "English for Professionals",
    instructor: "British Council",
    org: "British Council",
    rating: 4.7,
    students: "3.5k",
    level: "All Levels",
    image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1000&auto=format&fit=crop",
    category: "Language"
  },
  {
    id: 4,
    title: "Mesopotamian Art History",
    instructor: "Dr. Ali Hassan",
    org: "National Museum",
    rating: 5.0,
    students: "400",
    level: "Advanced",
    image: "https://images.unsplash.com/photo-1599592237834-0f2c4232a5df?q=80&w=1000&auto=format&fit=crop",
    category: "Art"
  }
];

const ARTICLES = [
  {
    title: "Why Soft Skills matter more than Code",
    readTime: "5 min read",
    tag: "Career Growth",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1000"
  },
  {
    title: "The Rise of Remote Work in Iraq",
    readTime: "8 min read",
    tag: "Industry Trends",
    image: "https://images.unsplash.com/photo-1593642632823-8f7853670961?q=80&w=1000"
  },
  {
    title: "Scholarship Guide 2026",
    readTime: "12 min read",
    tag: "Education",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1000"
  }
];

export default function AcademyPage() {
  const [activeTab, setActiveTab] = useState<'learn' | 'exchange'>('learn');

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      
      {/* 1. HERO SECTION */}
      <section className="bg-brand-dark text-white pt-20 pb-32 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="md:w-1/2">
              <Badge variant="brand" className="mb-6 bg-blue-600 border-blue-400 text-white">THE ACADEMY PLATFORM</Badge>
              <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">
                Expand Your <span className="text-brand-yellow">Horizon.</span>
              </h1>
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Whether you want to master a new skill online or travel the world for a cultural exchange, your journey starts here.
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-md">
                <Input 
                  placeholder="What do you want to learn today?" 
                  className="h-14 pl-12 rounded-full border-none shadow-xl text-black"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              </div>
            </div>

            {/* Hero Stats */}
            <div className="md:w-1/2 grid grid-cols-2 gap-4">
               <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                 <h3 className="text-3xl font-bold text-brand-pink mb-1">50+</h3>
                 <p className="text-sm text-slate-400">Online Courses</p>
               </div>
               <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                 <h3 className="text-3xl font-bold text-brand-yellow mb-1">12</h3>
                 <p className="text-sm text-slate-400">Exchange Partners</p>
               </div>
               <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                 <h3 className="text-3xl font-bold text-blue-400 mb-1">10k</h3>
                 <p className="text-sm text-slate-400">Active Learners</p>
               </div>
               <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                 <h3 className="text-3xl font-bold text-green-400 mb-1">Cert.</h3>
                 <p className="text-sm text-slate-400">Global Recognition</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TAB NAVIGATION */}
      <div className="sticky top-20 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          <button 
            onClick={() => setActiveTab('learn')}
            className={`py-4 font-bold text-sm uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'learn' ? 'border-brand-pink text-brand-dark' : 'border-transparent text-slate-500 hover:text-brand-dark'}`}
          >
            Online Learning
          </button>
          <button 
            onClick={() => setActiveTab('exchange')}
            className={`py-4 font-bold text-sm uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'exchange' ? 'border-brand-pink text-brand-dark' : 'border-transparent text-slate-500 hover:text-brand-dark'}`}
          >
            Cultural Exchange
          </button>
        </div>
      </div>

      {/* 3. MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 py-12 min-h-[500px]">
        
        {/* TAB 1: ONLINE COURSES (Coursera Style) */}
        {activeTab === 'learn' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            
            <div className="flex justify-between items-end mb-8">
              <h2 className="text-3xl font-bold text-brand-dark">Featured Courses</h2>
              <Button variant="ghost">View All Categories <ArrowRight size={16} className="ml-2" /></Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {COURSES.map((course) => (
                <Card key={course.id} className="group hover:shadow-xl transition-all duration-300 border-none shadow-sm h-full flex flex-col">
                  <div className="relative h-48 rounded-t-2xl overflow-hidden">
                    <Image src={course.image} alt={course.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded shadow-sm">
                      {course.category}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden relative">
                         {/* Placeholder for org logo */}
                         <div className="absolute inset-0 bg-brand-dark"></div> 
                      </div>
                      <span className="text-xs font-medium text-slate-500">{course.org}</span>
                    </div>
                    <h3 className="font-bold text-brand-dark leading-tight mb-2 group-hover:text-brand-pink transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">{course.instructor}</p>
                    
                    <div className="mt-auto flex items-center gap-4 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-yellow-500"><Star size={12} fill="currentColor" /> {course.rating}</span>
                      <span>{course.students} students</span>
                      <span>• {course.level}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Learning Paths */}
            <div className="mt-20">
               <h2 className="text-2xl font-bold text-brand-dark mb-6">Career Paths</h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['Data Scientist', 'Product Manager', 'UX Designer'].map((role, i) => (
                    <div key={i} className="bg-white border border-slate-200 p-6 rounded-xl flex items-center justify-between hover:border-brand-pink cursor-pointer transition-colors">
                       <div>
                         <h3 className="font-bold text-brand-dark">{role}</h3>
                         <p className="text-sm text-slate-500">5 Courses • Professional Cert.</p>
                       </div>
                       <Award className="text-slate-300" />
                    </div>
                  ))}
               </div>
            </div>

          </motion.div>
        )}

        {/* TAB 2: CULTURAL EXCHANGE */}
        {activeTab === 'exchange' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-brand-dark mb-4">Bridging Baghdad & The World</h2>
              <p className="text-slate-500">
                Our exchange programs are designed to foster deep cultural understanding and create lifelong global connections.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Program 1 */}
              <Card className="p-8 border-t-4 border-blue-500 hover:-translate-y-1 transition-transform">
                <Plane className="w-12 h-12 text-blue-500 mb-6" />
                <h3 className="text-2xl font-bold text-brand-dark mb-3">Global Student Exchange</h3>
                <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                  Spend a semester abroad at one of our 12 partner universities in Europe, Japan, or the USA. Full scholarships available for top performers.
                </p>
                <div className="space-y-2 mb-8">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 p-2 rounded">
                    <Clock size={14} /> Duration: 4-6 Months
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 p-2 rounded">
                    <Globe size={14} /> Locations: UK, Japan, Germany
                  </div>
                </div>
                <Button className="w-full" variant="outline">Download Syllabus</Button>
              </Card>

              {/* Program 2 */}
              <Card className="p-8 border-t-4 border-brand-pink hover:-translate-y-1 transition-transform">
                <Landmark className="w-12 h-12 text-brand-pink mb-6" />
                <h3 className="text-2xl font-bold text-brand-dark mb-3">Heritage Reborn</h3>
                <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                A collaborative residency for artists and historians to digitize Iraq&apos;s ancient history using VR and AI technology.
                </p>
                <div className="space-y-2 mb-8">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 p-2 rounded">
                    <Clock size={14} /> Duration: 6 Weeks
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 p-2 rounded">
                    <Users size={14} /> For: Artists & Devs
                  </div>
                </div>
                <Button className="w-full" variant="outline">View Gallery</Button>
              </Card>

              {/* Program 3 */}
              <Card className="p-8 border-t-4 border-brand-yellow hover:-translate-y-1 transition-transform">
                <Users className="w-12 h-12 text-brand-yellow mb-6" />
                <h3 className="text-2xl font-bold text-brand-dark mb-3">The Majlis Dialogue</h3>
                <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                  A weekly digital town hall connecting Iraqi entrepreneurs with Silicon Valley mentors and global thought leaders.
                </p>
                <div className="space-y-2 mb-8">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 p-2 rounded">
                    <Clock size={14} /> Every Thursday @ 8PM
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 p-2 rounded">
                    <Globe size={14} /> Format: Zoom Live
                  </div>
                </div>
                <Button className="w-full" variant="outline">Register Free</Button>
              </Card>
            </div>

          </motion.div>
        )}

      </main>

      {/* 4. THE IDEA BLOG (Shared Section) */}
      <section className="bg-white border-t border-slate-100 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl font-bold text-brand-dark">Insights & Skills</h2>
            <Button variant="ghost">Read the Blog <ArrowRight size={16} className="ml-2" /></Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {ARTICLES.map((article, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="relative h-56 rounded-2xl overflow-hidden mb-4">
                  <Image src={article.image} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold text-brand-pink uppercase tracking-wider">{article.tag}</span>
                  <span className="text-xs text-slate-400">{article.readTime}</span>
                </div>
                <h3 className="text-xl font-bold text-brand-dark group-hover:text-brand-pink transition-colors">
                  {article.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
