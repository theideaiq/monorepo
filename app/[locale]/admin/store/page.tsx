'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StoreManager() {
  const [products, setProducts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ title: '', price: '', category: 'Gaming' });

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts(data || []);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('products').insert([
      { 
        title: newProduct.title, 
        price: parseInt(newProduct.price), 
        category: newProduct.category,
        image_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f" // Default placeholder
      }
    ]);

    if (error) toast.error("Failed to add product");
    else {
      toast.success("Product Added!");
      setIsModalOpen(false);
      fetchProducts();
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Are you sure?")) return;
    await supabase.from('products').delete().eq('id', id);
    toast.success("Product Deleted");
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-dark">Store Inventory</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} className="mr-2" /> Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((p) => (
          <Card key={p.id} className="p-4 relative group">
            <button onClick={() => handleDelete(p.id)} className="absolute top-2 right-2 p-2 bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={16} />
            </button>
            <div className="h-32 bg-slate-100 rounded-lg mb-4 bg-cover bg-center" style={{backgroundImage: `url(${p.image_url})`}}></div>
            <h3 className="font-bold text-brand-dark truncate">{p.title}</h3>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-slate-500">{p.category}</span>
              <span className="font-bold">{p.price.toLocaleString()} IQD</span>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Product">
        <form onSubmit={handleAddProduct} className="space-y-4">
          <Input label="Product Name" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} required />
          <Input label="Price (IQD)" type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
          <Select 
            label="Category" 
            options={[{value:'Gaming', label:'Gaming'}, {value:'Laptops', label:'Laptops'}, {value:'Phones', label:'Phones'}]}
            value={newProduct.category}
            onChange={e => setNewProduct({...newProduct, category: e.target.value})}
          />
          <Button type="submit" className="w-full">Create Listing</Button>
        </form>
      </Modal>
    </div>
  );
}
