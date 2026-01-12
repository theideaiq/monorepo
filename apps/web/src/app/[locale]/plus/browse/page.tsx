'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Camera, Info, PlayCircle } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
// UI
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { useRouter } from '@/i18n/navigation'; // Use localized router
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function PlusBrowsePage() {
  const router = useRouter();
  // biome-ignore lint/suspicious/noExplicitAny: migration
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rentingId, setRentingId] = useState<number | null>(null);

  const fetchCatalog = useCallback(async () => {
    // 1. Fetch the items from the catalog table
    const { data, error } = await supabase
      .from('rental_catalog')
      .select('*')
      .order('id');
    if (error) console.error(error);
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // biome-ignore lint/suspicious/noExplicitAny: migration
  const handleRent = async (item: any) => {
    setRentingId(item.id);

    // 1. Check Login
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please login to rent items');
      router.push('/login');
      return;
    }

    // 2. Create Rental Order
    const { error } = await supabase.from('rentals').insert({
      user_id: user.id,
      item_name: item.title,
      status: 'active',
      amount: item.daily_rate,
    });

    if (error) {
      toast.error('Rental failed. Try again.');
    } else {
      toast.success(`🎉 ${item.title} has been requested!`);
    }
    setRentingId(null);
  };

  if (loading) return <PageLoader />;

  // Filter items by category
  const games = items.filter((i) => i.category === 'Gaming');
  const books = items.filter((i) => i.category === 'Books');
  const tech = items.filter((i) => i.category === 'Tech');

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-20 font-sans">
      {/* 1. HERO HEADER (Netflix Style) */}
      <section className="relative h-[70vh] w-full flex items-center justify-start px-4 md:px-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2000"
            alt="Hero"
            fill
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-2xl mt-20">
          <Button
            variant="ghost"
            className="text-white mb-4 hover:bg-white/10 pl-0 gap-2"
            onClick={() => router.push('/plus')}
          >
            <ArrowLeft size={16} /> Back to Plans
          </Button>
          <Badge
            variant="brand"
            className="mb-4 bg-brand-pink text-white border-none"
          >
            IDEA PLUS ORIGINAL
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
            Unlimited <br />
            <span className="text-brand-yellow">Possibilities.</span>
          </h1>
          <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-lg">
            Rent the latest tech, games, and books. Delivered to your doorstep
            in Baghdad within 2 hours.
          </p>
          <div className="flex gap-4">
            <Button className="h-14 px-8 text-lg font-bold bg-white text-black hover:bg-slate-200 border-none">
              <PlayCircle className="mr-2 fill-black" /> Start Renting
            </Button>
            <Button
              variant="outline"
              className="h-14 px-8 text-lg font-bold border-slate-500 text-white hover:bg-white/10"
            >
              <Info className="mr-2" /> Details
            </Button>
          </div>
        </div>
      </section>

      {/* 2. CATALOG ROWS */}
      <div className="space-y-12 pl-4 md:pl-12 -mt-20 relative z-20">
        <CategoryRow
          title="Next-Gen Gaming"
          items={games}
          onRent={handleRent}
          rentingId={rentingId}
          icon={<PlayCircle size={20} className="text-brand-pink" />}
        />
        <CategoryRow
          title="Curated Library"
          items={books}
          onRent={handleRent}
          rentingId={rentingId}
          icon={<BookOpen size={20} className="text-blue-500" />}
        />
        <CategoryRow
          title="Tech & Gear"
          items={tech}
          onRent={handleRent}
          rentingId={rentingId}
          icon={<Camera size={20} className="text-brand-yellow" />}
        />
      </div>
    </div>
  );
}

// Sub-component for Horizontal Scrolling Rows
// biome-ignore lint/suspicious/noExplicitAny: migration
function CategoryRow({ title, items, onRent, rentingId, icon }: any) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold flex items-center gap-3 text-slate-100">
        {icon} {title}
      </h3>

      {/* Horizontal Scroll Container */}
      <div className="flex gap-4 overflow-x-auto pb-8 pr-12 no-scrollbar snap-x">
        {/* biome-ignore lint/suspicious/noExplicitAny: migration */}
        {items.map((item: any) => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.05, y: -5 }}
            className="min-w-[200px] md:min-w-[240px] bg-[#1f1f1f] rounded-lg overflow-hidden snap-start group relative border border-white/5 hover:border-brand-pink/50 transition-colors"
          >
            {/* Image */}
            <div className="relative h-[300px] w-full">
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                <p className="text-xs text-slate-300 mb-2 line-clamp-3">
                  {item.description}
                </p>
                <Button
                  // REMOVED size="sm" - Fixed the build error
                  onClick={() => onRent(item)}
                  isLoading={rentingId === item.id}
                  // Added "h-9 text-sm" here to make it small manually
                  className="w-full h-9 text-sm bg-white text-black hover:bg-brand-pink hover:text-white"
                >
                  {rentingId === item.id ? 'Requesting...' : 'Rent Now'}
                </Button>
              </div>
            </div>

            {/* Info Footer */}
            <div className="p-3">
              <h4 className="font-bold text-sm truncate text-white">
                {item.title}
              </h4>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-brand-yellow font-bold">
                  {item.daily_rate.toLocaleString()} IQD/day
                </span>
                {/* Changed variant to 'neutral' and kept the border classes to simulate outline */}
                <Badge
                  variant="neutral"
                  className="text-[10px] bg-transparent border border-slate-600 text-slate-400 py-0 h-5"
                >
                  In Stock
                </Badge>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
