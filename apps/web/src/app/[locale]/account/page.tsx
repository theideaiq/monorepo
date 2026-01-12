'use client';

import { createClient } from '@supabase/supabase-js';
import {
  Clock,
  LogOut,
  Package,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Tilt from 'react-parallax-tilt'; // For the 3D Card effect
import { Badge } from '@/components/ui/Badge';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Spinner';
// Use the localized router and translations
import { useRouter } from '@/i18n/navigation';

const supabase = createClient(
  // biome-ignore lint/style/noNonNullAssertion: migration
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // biome-ignore lint/style/noNonNullAssertion: migration
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AccountPage() {
  // 1. Use translation hook for static text
  const t = useTranslations('Account'); // We'll create this section next

  // biome-ignore lint/suspicious/noExplicitAny: migration
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // biome-ignore lint/suspicious/noExplicitAny: migration
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const getData = async () => {
      // 1. Get User
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      // Generate card details from user data
      setUserData(generateCardData(user));

      // 2. Get Their Rentals (Only theirs!)
      const { data } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id) // Security filter
        .order('created_at', { ascending: false });

      setRentals(data || []);
      setLoading(false);
    };

    getData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t('logged_out')); // Use translation
    router.push('/');
  };

  if (loading || !userData) return <PageLoader />;

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20 px-4 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-brand-dark">
              {t('title')}
            </h1>
            <p className="text-slate-500 flex items-center gap-2">
              <User size={16} /> {userData.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            {t('sign_out')} <LogOut size={16} className="ml-2 rtl:rotate-180" />
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* LEFT COLUMN: DIGITAL PATRON CARD */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6">
            <Tilt
              glareEnable={true}
              glareMaxOpacity={0.3}
              glareColor="#ffffff"
              glarePosition="all"
              scale={1.02}
              tiltMaxAngleX={10}
              tiltMaxAngleY={10}
              className="relative w-full aspect-[1.586] rounded-2xl overflow-hidden shadow-2xl transition-all hover:shadow-brand-pink/30"
            >
              {/* Dynamic Background */}
              <div className="absolute inset-0 bg-brand-dark">
                {/* Generative Blobs based on User ID to make it look unique */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-pink/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-70" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-yellow/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-70" />
                {/* Noise Texture */}
                <div
                  className="absolute inset-0 opacity-30 mix-blend-overlay"
                  style={{
                    backgroundImage:
                      'url("https://grainy-gradients.vercel.app/noise.svg")',
                  }}
                />
              </div>

              {/* Card Content */}
              <div className="relative h-full p-6 flex flex-col justify-between text-white z-10">
                {/* Top Row */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {/* Logo Mark */}
                    <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
                      <span className="font-black text-xl text-brand-yellow">
                        I.
                      </span>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-300 tracking-widest uppercase leading-none mb-1">
                        Citizen ID
                      </h3>
                      <p className="font-mono text-sm text-white tracking-wider">
                        {userData.member_id}
                      </p>
                    </div>
                  </div>
                  {/* Holographic Sticker */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-200/80 via-white/90 to-slate-200/80 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/50 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine" />
                    <Sparkles className="text-slate-900 w-6 h-6 relative z-10" />
                  </div>
                </div>

                {/* Middle Row (Chip) */}
                <div className="pl-1">
                  <div className="w-12 h-9 bg-gradient-to-br from-[#d4af37] to-[#c5a028] rounded-md shadow-md border border-[#a88520]/50 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-50 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.2)_2px,rgba(0,0,0,0.2)_4px)]" />
                    <div className="absolute inset-0 opacity-50 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.2)_2px,rgba(0,0,0,0.2)_4px)]" />
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="mt-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">
                        Member Name
                      </p>
                      {/* Use full name if available, otherwise first part of email */}
                      <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-md truncate max-w-[180px]">
                        {userData.full_name}
                      </h2>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">
                        Tier Status
                      </p>
                      <div className="flex items-center gap-1.5 justify-end bg-brand-dark/50 py-1 px-2 rounded-lg border border-white/10 backdrop-blur-sm">
                        <ShieldCheck size={14} className="text-brand-pink" />
                        <span className="font-bold text-sm text-brand-yellow uppercase tracking-wide">
                          {userData.tier}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400/80 text-center mt-4 uppercase tracking-widest">
                    Issued: {userData.join_date}
                  </p>
                </div>
              </div>

              {/* Glass Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none mix-blend-overlay" />
            </Tilt>
          </div>

          {/* RIGHT COLUMN: Rentals List (Your existing code) */}
          <div className="flex-1 space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark">
              {t('active_rentals')}
            </h2>

            {rentals.length === 0 ? (
              <Card className="p-12 text-center text-slate-400 border-dashed bg-slate-50/50">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('no_rentals')}</p>
                <Button
                  className="mt-6 shadow-xl shadow-brand-pink/20"
                  onClick={() => router.push('/plus')}
                >
                  {t('browse_catalog')}
                </Button>
              </Card>
            ) : (
              rentals.map((rental) => (
                <Card
                  key={rental.id}
                  className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-brand-pink/5 rounded-xl flex items-center justify-center border border-brand-pink/10">
                      <Package className="text-brand-pink" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-brand-dark">
                        {rental.item_name}
                      </h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                        <Clock size={14} /> {t('rented_on')}{' '}
                        {new Date(rental.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <Badge
                      variant={
                        rental.status === 'active'
                          ? 'warning'
                          : rental.status === 'delivered'
                            ? 'success'
                            : 'neutral'
                      }
                      className="capitalize"
                    >
                      {rental.status}
                    </Badge>
                    <p className="text-lg font-black text-brand-dark">
                      {rental.amount.toLocaleString()}{' '}
                      <span className="text-sm font-medium text-slate-500">
                        IQD
                      </span>
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to generate deterministic card data from the user object
// biome-ignore lint/suspicious/noExplicitAny: migration
function generateCardData(user: any) {
  // Create a short ID from the user's UUID (e.g., first 4 + last 4 chars)
  const shortId =
    `${user.id.substring(0, 4)}-${user.id.substring(user.id.length - 4)}`.toUpperCase();

  // Format the join date
  const joinDate = new Date(user.created_at)
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();

  // Determine name to display
  let fullName = user.user_metadata?.full_name;
  if (!fullName) {
    // Fallback: use the part of the email before the '@' and capitalize it
    const emailName = user.email?.split('@')[0] || 'Member';
    fullName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }

  return {
    email: user.email,
    member_id: shortId,
    join_date: joinDate,
    full_name: fullName,
    // Hardcoded for now, could be dynamic later
    tier: 'VISIONARY',
  };
}
