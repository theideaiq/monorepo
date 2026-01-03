'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Search, Filter, ShoppingCart, Heart, Star, 
  Zap, ShieldCheck, Tag, Gamepad2, Laptop, Book, Smartphone 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// UI Kit
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

// Mock Data (The Marketplace)
const PRODUCTS = [
  {
    id: 1,
    title: "PlayStation 5 Slim Console",
    price: 650000,
    category: "Gaming",
    condition: "New",
    seller: "The IDEA Official",
    rating: 5.0,
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=800",
    isVerified: true
  },
  {
    id: 2,
    title: "MacBook Air M2 (Midnight)",
    price: 1450000,
    category: "Laptops",
    condition: "Open Box",
    seller: "TechResale Baghdad",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=800",
    isVerified: true
  },
  {
    id: 3,
    title: "Xbox Series X Controller",
    price: 85000,
    category: "Accessories",
    condition: "Used - Good",
    seller: "GamerAli99",
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&q=80&w=800",
    isVerified: false
  },
  {
    id: 4,
    title: "iPhone 15 Pro Max",
    price: 1850000,
    category: "Phones",
    condition: "New",
    seller: "The IDEA Official",
    rating: 5.0,
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800",
    isVerified: true
  },
  {
    id: 5,
    title:
