'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Clapperboard,
  Gamepad2,
  Megaphone,
  Music,
  Palette,
  Send,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Data structure mapping the Telegram channels
const clubChannels = [
  {
    id: 'announcements',
    title: 'The Stage',
    subtitle: 'Announcements & Big News',
    icon: Megaphone,
    color: 'from-brand-yellow to-orange-500',
    delay: 0.1,
    colSpan: 'md:col-span-2',
  },
  {
    id: 'music',
    title: 'Vibe Check',
    subtitle: 'Music sharing & playlists',
    icon: Music,
    color: 'from-brand-pink to-purple-600',
    delay: 0.2,
    colSpan: 'md:col-span-1',
  },
  {
    id: 'books',
    title: 'The Library',
    subtitle: 'What are you reading?',
    icon: BookOpen,
    color: 'from-green-400 to-emerald-600',
    delay: 0.3,
    colSpan: 'md:col-span-1',
  },
  {
    id: 'cinema',
    title: 'Screening Room',
    subtitle: 'Cinema & TV discussions',
    icon: Clapperboard,
    color: 'from-red-500 to-brand-pink',
    delay: 0.4,
    colSpan: 'md:col-span-2',
  },
  {
    id: 'games',
    title: 'The Arcade',
    subtitle: 'Gaming & Esports',
    icon: Gamepad2,
    color: 'from-blue-500 to-indigo-600',
    delay: 0.5,
    colSpan: 'md:col-span-1',
  },
  {
    id: 'sports',
    title: 'The Arena',
    subtitle: 'Sports talk & debates',
    icon: Trophy,
    color: 'from-orange-400 to-red-500',
    delay: 0.6,
    colSpan: 'md:col-span-1',
  },
  {
    id: 'arts',
    title: 'Creative Studio',
    subtitle: 'Arts & Design showcase',
    icon: Palette,
    color: 'from-purple-400 to-pink-400',
    delay: 0.7,
    colSpan: 'md:col-span-1',
  },
  {
    id: 'office',
    title: 'The Office',
    subtitle: 'Work & Networking',
    icon: Briefcase,
    color: 'from-slate-400 to-slate-600',
    delay: 0.8,
    colSpan: 'md:col-span-1',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function ClubPage() {
  // ✅ FIX: Removed the space in the variable name
  const telegramLink = 'https://t.me/theideaclub';

  return (
    <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-pink selection:text-white overflow-hidden">
      {/* --- Background Elements --- */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-pink/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-yellow/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        {/* --- HERO SECTION --- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-bold uppercase tracking-widest mb-6">
            <Users size={16} className="text-brand-yellow" />
            <span className="text-slate-300">827+ Members Strong</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">
            Welcome to <br />
            The{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow via-white to-brand-pink animate-gradient-xy">
              IDEA Club.
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            More than a group chat. It&apos;s a digital clubhouse for
            innovators, artists, gamers, and thinkers. Pick your rooms, join the
            conversation.
          </p>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <a href={telegramLink} target="_blank" rel="noopener noreferrer">
              <Button className="h-16 px-10 text-lg rounded-full bg-gradient-to-r from-brand-pink to-orange-500 hover:from-brand-pink/80 hover:to-orange-500/80 shadow-[0_0_40px_rgba(233,30,99,0.3)] border-0 flex items-center gap-3">
                <Send size={24} />
                Join the Telegram
              </Button>
            </a>
          </motion.div>
        </motion.div>

        {/* --- THE CLUBHOUSE GRID (Bento Box Style) --- */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto"
        >
          {clubChannels.map((channel) => (
            <motion.a
              key={channel.id}
              href={telegramLink} // Linking them all to main group for now
              target="_blank"
              rel="noopener noreferrer"
              variants={itemVariants}
              className={`relative group overflow-hidden rounded-3xl p-6 ${channel.colSpan} bg-slate-900/40 border border-white/5 backdrop-blur-md hover:border-white/20 transition-all duration-500 h-[180px] md:h-[220px] flex flex-col justify-between`}
            >
              {/* Hover Gradient Background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${channel.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 z-0`}
              />
              {/* Dark overlay on hover to keep text readable */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 z-1 transition-opacity duration-500" />

              <div className="relative z-10">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${channel.color} flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-500`}
                >
                  <channel.icon size={24} className="text-white" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-1 group-hover:translate-x-2 transition-transform duration-300">
                  {channel.title}
                </h3>
                <p className="text-slate-400 text-sm font-medium group-hover:text-slate-200 group-hover:translate-x-2 transition-transform duration-300 delay-75">
                  {channel.subtitle}
                </p>
              </div>

              {/* Arrow Icon showing on hover */}
              <div className="absolute bottom-6 right-6 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-10">
                <ArrowRight className="text-white" />
              </div>
            </motion.a>
          ))}
        </motion.div>

        {/* --- FOOTER CALL TO ACTION --- */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-24 text-center bg-gradient-to-r from-brand-pink/10 to-brand-yellow/10 rounded-3xl p-12 border border-white/5"
        >
          <Sparkles size={40} className="text-brand-yellow mx-auto mb-6" />
          <h2 className="text-3xl font-black mb-4">Ready to jump in?</h2>
          <p className="text-slate-400 mb-8">
            The community is active 24/7. Don&apos;t miss out on the next big
            idea or late-night gaming session.
          </p>
          <a
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <span className="text-brand-pink font-bold flex items-center gap-2 hover:gap-4 transition-all">
              Open Telegram <ArrowRight size={20} />
            </span>
          </a>
        </motion.div>
      </div>
    </div>
  );
}
