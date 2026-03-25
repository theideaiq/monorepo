type RentalCatalogItem = {
  id: number;
  title: string;
  category: string;
  daily_rate: number;
  image_url: string | null;
  description: string | null;
};

interface CategoryRowProps {
  title: string;
  items: RentalCatalogItem[];
  onRent: (item: RentalCatalogItem) => void;
  rentingId: number | null;
  icon?: React.ReactNode;
}
