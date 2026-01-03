'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { UserPlus, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
      toast.success("Account created! Logging you in...");
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
            <Link href="/login" className="text-brand-pink font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
