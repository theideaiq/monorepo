import React from 'react';
import Image from 'next/image';
import { ShoppingBag, GraduationCap, PlayCircle, Users, ArrowRight } from 'lucide-react';

export default function Home() {
  const services = [
    {
      title: "The Megastore",
      domain: "https://megastore.theideaiq.com",
      description: "Premium products, curated for your lifestyle.",
      icon: <ShoppingBag className="w-8 h-8 text-brand-pink" />,
      action: "Shop Now"
    },
    {
      title: "The Academy",
      domain: "https://academy.theideaiq.com",
      description: "Courses, exchange programs, and cultural articles.",
      icon: <GraduationCap className="w-8 h-8 text-brand-pink" />,
      action: "Learn More"
    },
    {
      title: "IDEA Plus",
      domain: "https://plus.theideaiq.com",
      description: "Rentals for books, games, and movies. Delivered.",
      icon: <PlayCircle className="w-8 h-8 text-brand-pink" />,
      action: "Start Renting"
    },
    {
      title: "The Network",
      domain: "https://connect.theideaiq.com",
      description: "Professional networking and HR management solutions.",
      icon: <Users className="w-8 h-8 text-brand-pink" />,
      action: "Connect"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-brand-dark font-sans selection:bg-brand-yellow selection:text-brand-pink">
      
      {/* Hero Section */}
      <section className="pt-40 pb-24 px-4 bg-brand-pink text-white text-center rounded-b-[3rem] shadow-xl">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-brand-yellow font-medium text-sm">
            Welcome to the Ecosystem
          </div>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
            Innovation for <br/>
            <span className="text-brand-yellow">Every Aspect</span> of Life.
          </h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto mb-10 font-light">
            Bridging the gap between commerce, education, entertainment, and professional growth in Iraq.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="#services" className="bg-brand-yellow text-brand-dark px-8 py-4 rounded-full font-bold hover:bg-yellow-400 transition shadow-lg flex items-center justify-center gap-2">
              Explore Services <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-brand-dark">The Ecosystem</h2>
          <p className="mt-4 text-slate-500">One account. Endless possibilities.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <a 
              key={index} 
              href={service.domain}
              className="group p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center mb-6 group-hover:bg-brand-pink transition-colors duration-300">
                <div className="group-hover:text-white transition-colors">
                  {service.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold text-brand-dark mb-2">{service.title}</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">{service.description}</p>
              <div className="flex items-center text-sm font-bold text-brand-pink group-hover:gap-2 transition-all">
                {service.action} <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
