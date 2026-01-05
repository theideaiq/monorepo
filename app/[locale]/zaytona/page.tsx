'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Phone, Instagram, Leaf, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// --- MENU DATA (From your Menu Image) ---
const MENU_ITEMS = [
  {
    id: 1,
    name: "Taco Night",
    nameAr: "تاكو نايت",
    price: "6,000",
    description: "Lettuce, tomatoes, cheese, corn, black olives, beans, special dressing.",
    calories: "450 kcal", // Estimated
    image: "https://images.unsplash.com/photo-1599974579688-8dbdd3b43d36?q=80&w=2000", // Taco Salad lookalike
    tags: ["Spicy", "Protein"]
  },
  {
    id: 2,
    name: "Caesar Salad",
    nameAr: "سلطة السيزر",
    price: "6,000",
    description: "Crisp lettuce, grilled chicken breast, parmesan cheese, crunchy croutons, Caesar dressing.",
    calories: "380 kcal",
    image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?q=80&w=2000",
    tags: ["Classic", "Chicken"]
  },
  {
    id: 3,
    name: "Feta Salad",
    nameAr: "سلطة الفيتا",
    price: "5,500",
    description: "Feta cheese, fresh cucumbers, tomatoes, lettuce, black olives, chickpeas, mushrooms.",
    calories: "320 kcal",
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=2000",
    tags: ["Vegetarian", "Fresh"]
  },
  {
    id: 4,
    name: "Energy Salad",
    nameAr: "أبو الطاقة",
    price: "4,500",
    description: "Watercress (Jarjeer), fresh mint, parsley, parmesan, croutons, raisins, balsamic glaze.",
    calories: "280 kcal",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2000",
    tags: ["Power", "Light"]
  },
  {
    id: 5,
    name: "Vitamin Dose",
    nameAr: "كرڤة فيتامين",
    price: "2,000",
    description: "A cup of fresh, seasonal cut fruits. The perfect natural sugar rush.",
    calories: "150 kcal",
    image: "https://images.unsplash.com/photo-1519996529931-28324d1a630e?q=80&w=2000", // Fruit cup
    tags: ["Vegan", "Sweet"]
  }
];

export default function ZaytonaPage() {
  
  const handleOrder = (itemName: string) => {
    // WhatsApp Direct Link
    const message = `Hi Zaytona! I would like to order: ${itemName}`;
    window.open(`https://wa.me/9647813100060?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#FDFDF9] font-sans selection:bg-green-100">
      
      {/* 1. HERO SECTION */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-10" style={{backgroundImage: 'radial-gradient(#4d7c0f 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
        
        <div className="container relative z-10 flex flex-col items-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full font-bold text-xs uppercase tracking-widest mb-6">
              <Leaf size={14} /> The IDEA Kitchen
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-[#1a1a1a] mb-4 tracking-tighter">
              ZAYTONA<span className="text-green-600">.</span>
            </h1>
            <p className="text-xl md:text-2xl text-stone-500 max-w-lg mx-auto font-medium">
              Real food for real innovators. <br/> Fresh, clean, and delivered to your desk.
            </p>
          </motion.div>
        </div>

        {/* Floating Abstract Vegetables (Visual Flair) */}
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 6 }} className="absolute top-20 left-[10%] opacity-20 w-32 h-32 bg-green-500 rounded-full blur-3xl"></motion.div>
        <motion.div animate={{ y: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 7 }} className="absolute bottom-20 right-[10%] opacity-20 w-40 h-40 bg-yellow-500 rounded-full blur-3xl"></motion.div>
      </section>


      {/* 2. MENU GRID */}
      <section className="container mx-auto px-4 pb-32 max-w-6xl -mt-20 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {MENU_ITEMS.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -10 }}
              className="group bg-white rounded-[2rem] p-4 shadow-xl shadow-stone-200/50 hover:shadow-2xl hover:shadow-green-900/10 transition-all duration-300 border border-stone-100"
            >
              {/* Image Card */}
              <div className="relative h-64 w-full rounded-[1.5rem] overflow-hidden mb-6">
                <Image 
                  src={item.image} 
                  alt={item.name} 
                  fill 
                  className="object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute top-4 left-4 flex gap-2">
                   {item.tags.map(tag => (
                     <span key={tag} className="bg-white/90 backdrop-blur text-xs font-bold px-3 py-1 rounded-full text-stone-800 shadow-sm">
                       {tag}
                     </span>
                   ))}
                </div>
              </div>

              {/* Content */}
              <div className="px-2 pb-2">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-2xl font-bold text-stone-800">{item.name}</h3>
                    <p className="text-sm font-arabic text-stone-400 font-bold">{item.nameAr}</p>
                  </div>
                  <span className="text-xl font-black text-green-600">{item.price}</span>
                </div>
                
                <p className="text-stone-500 text-sm leading-relaxed mb-6 h-12 line-clamp-2">
                  {item.description}
                </p>

                <div className="flex items-center gap-4 pt-4 border-t border-stone-100">
                  <div className="flex-1">
                     <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Energy</span>
                     <p className="text-stone-800 font-bold">{item.calories}</p>
                  </div>
                  <Button 
                    onClick={() => handleOrder(item.name)}
                    className="bg-[#1a1a1a] text-white rounded-full px-6 hover:bg-green-600 transition-colors"
                  >
                    Order <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}

        </div>
      </section>


      {/* 3. FOOTER INFO */}
      <section className="bg-[#1a1a1a] text-white py-20 rounded-t-[3rem]">
        <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-8">Visit The IDEA Kitchen</h2>
            
            <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
               <div className="flex items-center gap-4 text-stone-300">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-green-400">
                    <Phone size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-widest text-stone-500">Call to Order</p>
                    <p className="text-xl font-bold">0781 310 0060</p>
                  </div>
               </div>

               <div className="flex items-center gap-4 text-stone-300">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-yellow-400">
                    <Instagram size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-widest text-stone-500">Follow Us</p>
                    <p className="text-xl font-bold">@Zaytonaiq</p>
                  </div>
               </div>
            </div>

            <div className="mt-16 pt-16 border-t border-white/10">
               <p className="text-stone-600 text-sm">Part of The IDEA Spaces Ecosystem.</p>
            </div>
        </div>
      </section>

    </div>
  );
}
