import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import ProfileForm from './ProfileForm';
import RentalsList from './RentalsList';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // We assume auth/callback handles redirect back or we just go to login
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  // Rentals
  const { data: rentals } = await supabase
    .from('rentals')
    .select('*, product:products(name, image_url)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const t = await getTranslations('Account');

  return (
    <div className="container mx-auto py-12 px-4 space-y-12">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      <section>
        <h2 className="text-xl font-semibold mb-4">{t('profile')}</h2>
        <ProfileForm profile={profile} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">{t('subscription')}</h2>
         <div className="bg-white p-6 rounded-lg shadow border border-slate-100 max-w-md">
            <p className="mb-2">{t('currentTier')}: <strong className="uppercase">{profile?.rental_tier || 'Basic'}</strong></p>
            <a href="#" className="text-blue-600 hover:underline block text-sm">
               {t('manageSubscription')}
            </a>
         </div>
      </section>

      <section>
         <h2 className="text-xl font-semibold mb-4">{t('activeRentals')}</h2>
         <RentalsList rentals={rentals || []} />
      </section>
    </div>
  );
}
