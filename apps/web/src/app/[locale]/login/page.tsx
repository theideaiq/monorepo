'use client';

import { env } from '@/env';
import { Button, Card, Input } from '@repo/ui';
import { createClient } from '@supabase/supabase-js';
import { ArrowRight, Chrome, Lock } from 'lucide-react'; // Added Chrome icon for Google
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Welcome back!');
      router.push('/account');
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // This ensures they come back to your live site, not localhost
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-dark rounded-xl flex items-center justify-center text-white mx-auto mb-4">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl font-bold text-brand-dark">Staff Access</h1>
          <p className="text-slate-500">Enter your credentials to continue.</p>
        </div>

        {/* GOOGLE BUTTON */}
        <Button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 mb-6 flex items-center justify-center gap-2"
        >
          <Chrome size={20} className="text-blue-500" /> Continue with Google
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@theideaiq.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button isLoading={loading} className="w-full" variant="dark">
            Sign In <ArrowRight size={18} className="ml-2" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
