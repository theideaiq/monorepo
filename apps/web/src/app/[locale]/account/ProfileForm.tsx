'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { updateProfile } from '@/actions/account';

// biome-ignore lint/suspicious/noExplicitAny: Profile type definition pending
export default function ProfileForm({ profile }: { profile: any }) {
  const t = useTranslations('Account');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      await updateProfile(formData);
      toast.success('Profile updated');
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error(e.message);
      } else {
        toast.error('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      action={handleSubmit}
      className="bg-white p-6 rounded-lg shadow border border-slate-100 max-w-md"
    >
      <div className="mb-4">
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Full Name
        </label>
        <input
          type="text"
          name="fullName"
          id="fullName"
          defaultValue={profile?.full_name || ''}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : t('save')}
      </button>
    </form>
  );
}
