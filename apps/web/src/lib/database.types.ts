export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      carts: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          created_at?: string;
        };
        // biome-ignore lint/complexity/noBannedTypes: legacy
        Update: {};
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          category: string;
          stock_count: number;
          slug: string;
          details: Json;
          is_verified: boolean;
          condition: string;
          seller: string;
          images: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          category: string;
          stock_count?: number;
          slug: string;
          details?: Json;
          is_verified?: boolean;
          condition?: string;
          seller?: string;
          images?: string[];
          created_at?: string;
        };
        // biome-ignore lint/complexity/noBannedTypes: legacy
        Update: {
          // ...
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string;
          price_override: number | null;
          stock_count: number;
          attributes: Json;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          sku: string;
          price_override?: number | null;
          stock_count?: number;
          attributes?: Json;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          sku?: string;
          price_override?: number | null;
          stock_count?: number;
          attributes?: Json;
          image_url?: string | null;
        };
      };
    };
  };
}
