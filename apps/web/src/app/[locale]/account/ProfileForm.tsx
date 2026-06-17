import { Button } from '@repo/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { updateProfile } from '@/actions/account';

export default function ProfileForm({
  profile,
}: {
  profile: { full_name?: string; phone?: string; [key: string]: unknown };
}) {
  const t = useTranslations('Account');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateProfile(formData);
      toast.success('Profile updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium mb-1">
          {t('fullName')}
        </label>
        <input
          id="full_name"
          name="full_name"
          defaultValue={profile?.full_name || ''}
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1">
          {t('phone')}
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={profile?.phone || ''}
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3"
        />
      </div>
      <Button type="submit" isLoading={loading}>
        {t('save')}
      </Button>
    </form>
  );
}
