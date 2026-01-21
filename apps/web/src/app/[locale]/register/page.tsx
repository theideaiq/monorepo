'use client';

import { Button, Card, Input } from '@repo/ui';
import { ArrowRight, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Account created! Logging you in...');
      setLoading(false);
      router.push('/account'); // Send them to their new dashboard
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 pt-20">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-pink rounded-xl flex items-center justify-center text-white mx-auto mb-4">
            <UserPlus size={24} />
          </div>
          <h1 className="text-2xl font-bold text-brand-dark">Join The IDEA</h1>
          <p className="text-slate-500">Create one account for everything.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Create Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button isLoading={loading} className="w-full">
            Create Account <ArrowRight size={18} className="ml-2" />
          </Button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-brand-pink font-bold hover:underline"
            >
              Sign In
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
