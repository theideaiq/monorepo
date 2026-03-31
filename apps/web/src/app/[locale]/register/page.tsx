'use client';

import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
