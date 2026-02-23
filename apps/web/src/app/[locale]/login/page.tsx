'use client';

import { Button, Input } from '@repo/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Chrome, Loader2, Lock, Mail, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        toast.success('Check your email to confirm your account');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Logged in successfully');
        router.push('/');
        router.refresh();
      }
      // biome-ignore lint/suspicious/noExplicitAny: legacy
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider: 'google') {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      // biome-ignore lint/suspicious/noExplicitAny: legacy
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-slate-400">
              {mode === 'login'
                ? 'Enter your details to access your account'
                : 'Join The IDEA to start your journey'}
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <Button
              variant="outline"
              className="w-full justify-center gap-2 h-12"
              onClick={() => handleSocialLogin('google')}
            >
              <Chrome size={20} />
              Continue with Google
            </Button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-slate-500">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mb-4">
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: legacy */}
                    <label className="text-sm text-slate-400 mb-1 block">
                      Full Name
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        size={18}
                      />
                      <Input
                        name="fullName"
                        placeholder="John Doe"
                        className="pl-10 bg-white/5 border-white/10 text-white"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: legacy */}
              <label className="text-sm text-slate-400 mb-1 block">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <Input
                  type="email"
                  name="email"
                  placeholder="john@example.com"
                  className="pl-10 bg-white/5 border-white/10 text-white"
                  required
                />
              </div>
            </div>

            <div>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: legacy */}
              <label className="text-sm text-slate-400 mb-1 block">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <Input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  className="pl-10 bg-white/5 border-white/10 text-white"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-brand-yellow text-black hover:bg-brand-yellow/90"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
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
          </div>
        </div>
      </div>
    </div>
  );
}
