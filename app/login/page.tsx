'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

// IMPORT YOUR UI KIT
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
      toast.success("Welcome back!");
      // Smart Redirect
      if (email === "shaheenfarjo@gmail.com") {
        router.push('/admin');
      } else {
        router.push('/account');
      }
    }
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

          <Button 
            isLoading={loading}
            className="w-full"
            variant="dark"
          >
            Sign In <ArrowRight size={18} className="ml-2" />
          </Button>
        </form>

      </Card>
    </div>
  );
}
