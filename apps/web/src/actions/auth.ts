import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

export async function enrollMFA() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    type: data.type,
    qr: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function verifyMFA(code: string) {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totpFactor = factors?.totp[0];

  if (!totpFactor) {
    throw new Error('No TOTP factor found');
  }

  const { data, error } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: data.id,
    code,
  });

  if (verifyError) {
    throw new Error(verifyError.message);
  }

  return true;
}
