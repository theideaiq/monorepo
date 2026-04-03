'use client';

import { Button, Card, Input } from '@repo/ui';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function MFAPage() {
  const [mode, setMode] = useState<'enroll' | 'verify'>('verify');
  const [qr, setQr] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (!factors || factors.all.length === 0) {
      setMode('enroll');
      startEnrollment();
    } else {
      setMode('verify');
      const factor = factors.all.find((f) => f.factor_type === 'totp');
      if (factor) setFactorId(factor.id);
    }
  }

  async function startEnrollment() {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    setFactorId(data.id);
    QRCode.toDataURL(data.totp.uri, (err, url) => {
      if (!err) setQr(url);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) throw error;

      toast.success('Authentication successful');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-4">
          {mode === 'enroll' ? 'Setup 2FA' : 'Two-Factor Authentication'}
        </h1>

        {mode === 'enroll' && qr && (
          <div className="mb-6 flex flex-col items-center">
            <p className="text-sm text-slate-500 mb-2 text-center">
              Scan this QR code with your authenticator app
            </p>
            <img src={qr} alt="QR Code" className="w-48 h-48" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            required
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            {mode === 'enroll' ? 'Enable & Verify' : 'Verify'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
