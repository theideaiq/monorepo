'use client';

import { Button, Card, Input } from '@repo/ui';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { hasAdminAccess } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Check for error param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorMsg = params.get('error');
    if (errorMsg) {
      toast.error(errorMsg);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

      if (authError) throw authError;
      if (!data.user) throw new Error('No user returned');

      // Check role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        throw new Error(
          `Failed to verify permissions: ${profileError.message}`,
        );
      }

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('Profile not found for this user.');
      }

      if (!hasAdminAccess(profile.role)) {
        await supabase.auth.signOut();
        throw new Error(
          `Access Denied: Admin privileges required. Found role: ${profile.role}`,
        );
      }

      toast.success('Welcome back, Admin');
      router.push('/');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Lock className="h-6 w-6 text-slate-600" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Admin Login</h1>
            <p className="text-slate-500">Secure access for administrators</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
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

          <Button type="submit" className="w-full mt-4" isLoading={loading}>
            Sign In
          </Button>
        </form>
      </Card>
    </div>
  );
}
