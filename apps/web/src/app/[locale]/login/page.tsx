'use client';

import { Button } from '@repo/ui';
import { Lock, Mail, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  resetPassword,
  signInWithEmail,
  signUpWithEmail,
} from '@/actions/auth';

export default function LoginPage() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      if (mode === 'login') {
        await signInWithEmail(formData);
        toast.success(t('loginSuccess'));
        router.push(next);
        router.refresh();
      } else if (mode === 'register') {
        await signUpWithEmail(formData);
        toast.success(t('checkEmail'));
        setMode('login');
      } else {
        await resetPassword(formData);
        toast.success(t('resetSent'));
        setMode('login');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-20 px-4 bg-black">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">
            {mode === 'login' && t('loginTitle')}
            {mode === 'register' && t('registerTitle')}
            {mode === 'forgot' && t('forgotTitle')}
          </h1>
          <p className="text-slate-400">
            {mode === 'login' && t('loginSubtitle')}
            {mode === 'register' && t('registerSubtitle')}
            {mode === 'forgot' && t('forgotSubtitle')}
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="full_name"
                  className="text-sm text-slate-400 mb-1 block"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 pl-12 text-white placeholder-slate-600 focus:outline-none focus:border-brand-pink focus:ring-1 focus:ring-brand-pink transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="text-sm text-slate-400 mb-1 block"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 pl-12 text-white placeholder-slate-600 focus:outline-none focus:border-brand-pink focus:ring-1 focus:ring-brand-pink transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label
                  htmlFor="password"
                  className="text-sm text-slate-400 mb-1 block"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 pl-12 text-white placeholder-slate-600 focus:outline-none focus:border-brand-pink focus:ring-1 focus:ring-brand-pink transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              isLoading={loading}
              className="w-full h-12 bg-white text-black font-bold mt-4 hover:bg-brand-pink hover:text-white transition-colors"
            >
              {mode === 'login' && t('signIn')}
              {mode === 'register' && t('createAccount')}
              {mode === 'forgot' && t('sendResetLink')}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 flex flex-col gap-3 text-sm text-center">
            {mode === 'login' ? (
              <>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-brand-yellow hover:text-white transition-colors"
                >
                  Don't have an account? Sign up
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-brand-yellow hover:text-white transition-colors"
              >
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
