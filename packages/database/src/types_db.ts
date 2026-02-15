/**
 * This file is intended to hold the generated TypeScript definitions for the Supabase database.
 *
 * Run the following command to update types:
 * `npx supabase gen types typescript --project-id <your-project-id> > packages/database/src/types_db.ts`
 *
 * Currently contains manual definitions migrated from apps/web until automatic generation is fully integrated.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// We export 'Database' as 'any' to allow 'createClient' to be permissive,
// as our manual definitions are incomplete (missing Relationships, etc).
export type Database = any;

// We export the strict interface for manual type casting where needed.
export interface DatabaseSchema {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          type: 'sale' | 'rental' | 'auction';
          category: string;
          stock_count: number;
          rental_tier: string | null;
          created_at: string;
          updated_at: string;
          details: Json;
          condition: 'new' | 'used' | 'refurbished' | 'open_box';
          seller: string;
          is_verified: boolean;
          slug: string | null;
          images: string[] | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          type?: 'sale' | 'rental' | 'auction';
          category?: string;
          stock_count?: number;
          rental_tier?: string | null;
          created_at?: string;
          updated_at?: string;
          details?: Json;
          condition?: 'new' | 'used' | 'refurbished' | 'open_box';
          seller?: string;
          is_verified?: boolean;
          slug?: string | null;
          images?: string[] | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          type?: 'sale' | 'rental' | 'auction';
          category?: string;
          stock_count?: number;
          rental_tier?: string | null;
          created_at?: string;
          updated_at?: string;
          details?: Json;
          condition?: 'new' | 'used' | 'refurbished' | 'open_box';
          seller?: string;
          is_verified?: boolean;
          slug?: string | null;
          images?: string[] | null;
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string | null;
          stock_count: number | null;
          price_override: number | null;
          attributes: Json;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          sku?: string | null;
          stock_count?: number | null;
          price_override?: number | null;
          attributes?: Json;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          sku?: string | null;
          stock_count?: number | null;
          price_override?: number | null;
          attributes?: Json;
          image_url?: string | null;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          quantity: number;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          quantity: number;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          quantity?: number;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
          total_amount: number;
          shipping_address: Json | null;
          tracking_number: string | null;
          created_at: string;
          gateway_link_id: string | null;
          gateway_provider: string | null;
          gateway_metadata: Json | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
          total_amount: number;
          shipping_address?: Json | null;
          tracking_number?: string | null;
          created_at?: string;
          gateway_link_id?: string | null;
          gateway_provider?: string | null;
          gateway_metadata?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          status?: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
          total_amount?: number;
          shipping_address?: Json | null;
          tracking_number?: string | null;
          created_at?: string;
          gateway_link_id?: string | null;
          gateway_provider?: string | null;
          gateway_metadata?: Json | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
        };
      };
      rentals: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          due_date: string;
          status: 'active' | 'returned' | 'overdue';
          created_at: string;
          updated_at: string;
          item_name?: string; // Added inferred field
          amount?: number; // Added inferred field
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id?: string;
          due_date?: string;
          status: 'active' | 'returned' | 'overdue';
          created_at?: string;
          updated_at?: string;
          item_name?: string; // Added inferred field
          amount?: number; // Added inferred field
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          due_date?: string;
          status?: 'active' | 'returned' | 'overdue';
          created_at?: string;
          updated_at?: string;
          item_name?: string; // Added inferred field
          amount?: number; // Added inferred field
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
