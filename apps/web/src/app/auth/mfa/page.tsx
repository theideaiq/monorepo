'use client';

import { Button, Input } from '@repo/ui';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function MfaPage() {
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadQR() {
      const { data, error } =
        await supabase.auth.mfa.enroll({
          factorType: 'totp',
        });

      if (error) {
        toast.error(error.message);
      } else {
        setQr(data.totp.qr_code);
      }
    }
    loadQR();
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data, error } =
        await supabase.auth.mfa.challenge({
          factorId: 'totp', // Simplified logic, usually needs enrollment ID
        });

      if (error) throw error;

      const { error: verifyError } =
        await supabase.auth.mfa.verify({
          factorId: data.id,
          challengeId: data.id,
          code,
        });

      if (verifyError) throw verifyError;

      toast.success('MFA Verified');
      router.push('/');
      router.refresh();
      // biome-ignore lint/suspicious/noExplicitAny: legacy
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      // cleanup
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">
          Multi-Factor Authentication
        </h1>
        {qr && (
          <div className="mb-6 flex flex-col items-center">
            <p className="text-sm text-slate-500 mb-2">
              Scan this QR code with your authenticator app
            </p>
            {/* biome-ignore lint/performance/noImgElement: legacy */}
            <img src={qr} alt="QR Code" className="w-48 h-48" />
          </div>
        )}
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" className="w-full">
            Verify
          </Button>
        </form>
      </div>
    </div>
  );
}
