'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Button, Input } from '@repo/ui';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

const supabase = createClient();

export default function MFAPage() {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qr, setQr] = useState('');
  const router = useRouter();

  const setupMFA = useCallback(async () => {
    const enroll = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (enroll.error) {
      toast.error(enroll.error.message);
      return;
    }

    setFactorId(enroll.data.id);
    setQr(enroll.data.totp.qr_code);
  }, []);

  const checkStatus = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error('Error checking MFA status');
      return;
    }

    const verified = data.totp.find((f) => f.status === 'verified');
    if (verified) {
      // Already setup
      router.push('/account');
    } else {
      // Need setup
      setupMFA();
    }
  }, [router, setupMFA]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });

      if (verify.error) throw verify.error;

      toast.success('MFA Enabled');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      // biome-ignore lint/suspicious/noExplicitAny: Error handling
      toast.error((err as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black/50 p-8 rounded-2xl border border-white/10 backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-white mb-6">
          Multi-Factor Authentication
        </h1>

        {qr ? (
          <div className="space-y-6">
            <p className="text-slate-400 text-sm">
              Scan this QR code with your authenticator app
            </p>
            {/* biome-ignore lint/performance/noImgElement: External QR code URL */}
            <img src={qr} alt="QR Code" className="w-48 h-48" />
          </div>
        ) : (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-brand-yellow" />
          </div>
        )}

        <form onSubmit={onVerify} className="mt-6 space-y-4">
          <Input
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center text-xl tracking-widest"
            maxLength={6}
          />
          <Button
            type="submit"
            className="w-full bg-brand-yellow text-brand-dark font-bold"
            disabled={loading || code.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify & Enable'}
          </Button>
        </form>
      </div>
    </div>
  );
}
