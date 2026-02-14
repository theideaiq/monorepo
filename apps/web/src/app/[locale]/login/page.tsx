'use client';

import { Button, Input } from '@repo/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Chrome, Loader2, Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

import { signIn } from '@/actions/auth';
import { Link, useRouter } from '@/i18n/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      const result = await signIn(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Signed in successfully');
        router.push('/');
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-12 flex items-center justify-center relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-blue/20 via-transparent to-transparent opacity-50" />

      <div className="container px-4 relative z-10">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-slate-400">
              {mode === 'login'
                ? 'Enter your credentials to access your account'
                : 'Join the innovation revolution today'}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            {/* Social Login */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold h-12 rounded-xl hover:bg-slate-200 transition-colors mb-6"
            >
              <Chrome size={20} />
              Continue with Google
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0a0a0a] px-2 text-slate-500">
                  Or continue with email
                </span>
              </div>
            </div>

            <form action={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'register' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
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
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        />
                        <Input
                          id="fullName"
                          name="fullName"
                          placeholder="John Doe"
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-brand-yellow/50"
                          required
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
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-brand-yellow/50"
                    required
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
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-brand-yellow/50"
                    required
                  />
                </div>
              </div>

              {mode === 'login' && (
                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-brand-yellow hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-brand-yellow text-brand-dark font-bold rounded-xl hover:bg-brand-yellow/90 transition-all flex items-center justify-center gap-2 mt-6"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-brand-yellow hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-brand-yellow hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
