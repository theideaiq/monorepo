'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { enrollMFA, verifyMFA } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function MFAPage() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const [step, _setStep] = useState<'enroll' | 'verify'>('enroll');
  const [qr, setQr] = useState<string>('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    enrollMFA().then((data) => {
      if (data?.qr) {
        setQr(data.qr);
      }
    });
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await verifyMFA(code);
      toast.success(t('mfa_enabled'));
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('setup_mfa')}</CardTitle>
          <CardDescription>{t('mfa_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'enroll' && qr && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code with your authenticator app
              </p>
              {/* biome-ignore lint/performance/noImgElement: External QR code data URI */}
              <img src={qr} alt="QR Code" className="w-48 h-48" />
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="code">{t('verification_code')}</Label>
              <Input
                id="code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('verifying') : t('enable_mfa')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
