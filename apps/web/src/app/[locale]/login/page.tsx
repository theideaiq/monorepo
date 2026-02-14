'use client';

import { Button } from '@repo/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Chrome, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Welcome back to The IDEA.');
        router.push('/account');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success('Account created! Please check your email.');
        setMode('login');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-brand-bg">
      {/* LEFT: Brand Art */}
      <div className="relative hidden md:flex flex-col justify-between p-12 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-transparent" />

        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
            THE IDEA<span className="text-brand-yellow">.</span>
          </h1>
          <p className="text-slate-400">Innovation for Every Aspect of Life.</p>
        </div>

        <div className="relative z-10">
          <blockquote className="text-xl font-medium text-white max-w-lg leading-relaxed">
            &ldquo;The future is not something we enter. The future is something
            we create.&rdquo;
          </blockquote>
        </div>
      </div>

      {/* RIGHT: Auth Forms */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-white mb-2">
              {mode === 'login' ? 'Welcome back' : 'Join the revolution'}
            </h2>
            <p className="text-slate-400">
              {mode === 'login'
                ? 'Enter your credentials to access your account.'
                : 'Create your account to start shopping and renting.'}
            </p>
          </div>

          {/* Social Auth */}
          <Button
            onClick={handleGoogle}
            className="w-full h-12 bg-white text-black hover:bg-slate-200 border-none font-bold flex items-center justify-center gap-3"
          >
            <Chrome size={20} className="text-blue-600" />
            Continue with Google
          </Button>

          <div className="relative flex items-center gap-4 py-4">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-xs text-slate-500 uppercase tracking-widest">
              Or with email
            </span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mb-4">
                    <label
                      htmlFor="fullName"
                      className="text-sm text-slate-400 mb-1 block"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        size={18}
                      />
                      <input
                        id="fullName"
                        type="text"
                        required={mode === 'register'}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-white placeholder-slate-600 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label
                htmlFor="email"
                className="text-sm text-slate-400 mb-1 block"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-white placeholder-slate-600 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm text-slate-400 mb-1 block"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-white placeholder-slate-600 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-brand-yellow text-brand-dark hover:bg-yellow-400 border-none font-bold text-lg mt-6"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="text-center">
            <p className="text-slate-400">
              {mode === 'login'
                ? "Don't have an account? "
                : 'Already have an account? '}
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-brand-yellow hover:underline font-bold"
              >
                {mode === 'login' ? 'Register' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
